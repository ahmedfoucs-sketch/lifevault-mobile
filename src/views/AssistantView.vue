<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { pullAll, pushEncrypted } from "../services/api-client";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

type RepeatRule = "none" | "daily" | "weekly" | "monthly";
interface MemoryItem {
  text: string; category: string; createdAt: string;
  kind?: "note" | "reminder"; dueAt?: string;
  reminderStatus?: "pending" | "done";
  repeat?: RepeatRule; advanceMinutes?: number;
}
interface StoredItem { id: string; revision: number; deleted: boolean; data: MemoryItem | null; }
const draft = ref(""), items = ref<StoredItem[]>([]), busy = ref(false);
const error = ref(""), notice = ref(""), query = ref("");
const reminderDraft = ref<{ title: string; dueAt: string; repeat: RepeatRule; advanceMinutes: number } | null>(null);
const editing = ref<StoredItem | null>(null);
const visibleItems = computed(() => {
  const q = query.value.trim().toLocaleLowerCase();
  return items.value.filter(x => x.data && (!q || (x.data.text + " " + x.data.category).toLocaleLowerCase().includes(q)));
});
function dateAt(y:number,m:number,d:number,h:number,min:number) {
  const value = new Date(y,m,d,h,min,0,0);
  return value.getFullYear()===y && value.getMonth()===m && value.getDate()===d ? value : null;
}
function parseReminder(text: string) {
  const now = new Date();
  const clock = text.match(/(?:الساعة|ساعه|الـ)?\s*(\d{1,2})(?::(\d{2}))?\s*(صباحًا|صباحا|مساءً|مساء|ص|م)?/);
  let hour = clock ? Number(clock[1]) : 9;
  const minute = clock?.[2] ? Number(clock[2]) : 0;
  if (clock?.[3] && /مساء|م/.test(clock[3]) && hour < 12) hour += 12;
  if (clock?.[3] && /صباح|ص/.test(clock[3]) && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  let due: Date | null = null;
  const numeric = text.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  if (numeric) due = dateAt(Number(numeric[3]),Number(numeric[2])-1,Number(numeric[1]),hour,minute);
  else if (/بعد\s+ساعة/.test(text)) due = new Date(now.getTime()+60*60*1000);
  else if (/بعد\s+(\d+)\s+دقائق?/.test(text)) due = new Date(now.getTime()+Number(text.match(/بعد\s+(\d+)\s+دقائق?/)![1])*60000);
  else {
    let days = 0;
    const n = text.match(/بعد\s+(\d+)\s+أيام?/);
    if (n) days = Number(n[1]);
    else if (/بكرة|غدًا|غدا/.test(text)) days = 1;
    else if (/اليوم|النهارده|النهاردة/.test(text)) days = 0;
    else return null;
    due = new Date(now.getFullYear(),now.getMonth(),now.getDate()+days,hour,minute,0,0);
  }
  if (!due || due.getTime() <= now.getTime()) return null;
  const title = text.replace(/(?:فكرني|ذكرني|تذكير|موعد|لا تنسى|لا تنس|بكرة|غدًا|غدا|اليوم|النهارده|النهاردة|بعد\s+\d+\s+أيام?|بعد\s+ساعة|بعد\s+\d+\s+دقائق?|الساعة|ساعه|\d{1,2}[/\-]\d{1,2}[/\-]\d{4}|\d{1,2}(?::\d{2})?\s*(?:صباحًا|صباحا|مساءً|مساء|ص|م)?)/g," ").replace(/\s+/g," ").trim() || text;
  return { title, dueAt: due.toISOString() };
}
function detectCategory(text: string) {
  const s=text.toLocaleLowerCase();
  if (/عمل|وظيف|شركة|اجتماع|مشروع|دوام/.test(s)) return "عمل";
  if (/أب|أم|ابن|ابنة|زوج|زوجة|عائلة|أسرة/.test(s)) return "عائلة";
  if (/قسط|راتب|مال|فلوس|فاتورة|دفع|بنك/.test(s)) return "مالي";
  if (/طبيب|دواء|موعد طبي|تحليل|صحة/.test(s)) return "صحة";
  if (/أنا|شخصي|أفضل|أحب|تفضيل/.test(s)) return "شخصي";
  return "عام";
}
async function load() {
  error.value="";
  try {
    const result=await pullAll<MemoryItem>(0);
    items.value=result.items.filter(x=>x.type==="memory"&&!x.deleted&&x.data) as StoredItem[];
    items.value.sort((a,b)=>(a.data?.createdAt||"").localeCompare(b.data?.createdAt||"")*-1);
  } catch(e:any){error.value=e?.message||"تعذر تحميل الذكريات.";}
}
function notificationIds(id:string) {
  let hash=2166136261;
  for(let i=0;i<id.length;i++) hash=Math.imul(hash^id.charCodeAt(i),16777619);
  const base=(hash>>>0)%1000000000+1;
  return [base,base+1000000000];
}
async function cancelNotifications(id:string) {
  if(!Capacitor.isNativePlatform()) return;
  const ids=notificationIds(id);
  try { await LocalNotifications.cancel({notifications:ids.map(id=>({id}))}); } catch {}
}
async function scheduleNotifications(id:string,data:MemoryItem) {
  if(!Capacitor.isNativePlatform()||!data.dueAt) return "تم حفظ التذكير؛ الإشعارات تتطلب نسخة الهاتف.";
  let permission=await LocalNotifications.checkPermissions();
  if(permission.display!=="granted") permission=await LocalNotifications.requestPermissions();
  if(permission.display!=="granted") return "تم الحفظ، لكن إذن الإشعارات غير مفعّل.";
  const ids=notificationIds(id), due=new Date(data.dueAt), now=new Date();
  const notifications:any[]=[];
  const add=(notificationId:number,at:Date)=>{if(at>now) notifications.push({id:notificationId,title:"LifeVault AI",body:"لديك تذكير مستحق. افتح خزنتك لمراجعته.",schedule:{at,allowWhileIdle:true}});};
  add(ids[0],due);
  if((data.advanceMinutes||0)>0) add(ids[1],new Date(due.getTime()-(data.advanceMinutes||0)*60000));
  if(data.repeat&&data.repeat!=="none") {
    for(let i=1;i<=12;i++){
      const next=new Date(due);
      if(data.repeat==="daily") next.setDate(next.getDate()+i);
      if(data.repeat==="weekly") next.setDate(next.getDate()+7*i);
      if(data.repeat==="monthly") next.setMonth(next.getMonth()+i);
      if(next.getTime()-now.getTime()>365*86400000) break;
      // Schedule a bounded rolling set; stable notification IDs are refreshed on app open.
      const repeatId=(ids[0]+i*2)%2147483000;
      notifications.push({id:repeatId,title:"LifeVault AI",body:"لديك تذكير مستحق. افتح خزنتك لمراجعته.",schedule:{at:next,allowWhileIdle:true}});
    }
  }
  if(notifications.length) await LocalNotifications.schedule({notifications});
  return "تم حفظ التذكير وجدولة الإشعارات المتاحة على هذا الجهاز.";
}
async function saveMemory() {
  const value=draft.value.trim(); if(!value||busy.value)return;
  busy.value=true;error.value="";notice.value="";
  try {
    const reminder=parseReminder(value);
    if(reminder){reminderDraft.value={...reminder,repeat:/يوميًا|كل يوم/.test(value)?"daily":/أسبوعيًا|كل أسبوع/.test(value)?"weekly":/شهريًا|كل شهر/.test(value)?"monthly":"none",advanceMinutes:/قبل\s+ساعة/.test(value)?60:/قبل\s+نصف ساعة/.test(value)?30:0};return;}
    await pushEncrypted("memory",crypto.randomUUID(),{text:value,category:detectCategory(value),createdAt:new Date().toISOString(),kind:"note"} satisfies MemoryItem,0);
    draft.value="";notice.value="تم حفظ المعلومة مشفّرة داخل ذاكرتك الشخصية.";await load();
  }catch(e:any){error.value=e?.message||"لم نتمكن من الحفظ.";}finally{busy.value=false;}
}
async function confirmReminder() {
  if(!reminderDraft.value||busy.value)return;
  busy.value=true;error.value="";
  try{
    const r=reminderDraft.value,id=editing.value?.id||crypto.randomUUID(),revision=editing.value?.revision||0;
    const data:MemoryItem={text:r.title,category:detectCategory(r.title),createdAt:editing.value?.data?.createdAt||new Date().toISOString(),kind:"reminder",dueAt:r.dueAt,reminderStatus:"pending",repeat:r.repeat,advanceMinutes:r.advanceMinutes};
    if(editing.value) await cancelNotifications(id);
    await pushEncrypted("memory",id,data,revision);
    notice.value=await scheduleNotifications(id,data);
    reminderDraft.value=null;editing.value=null;draft.value="";await load();
  }catch(e:any){error.value=e?.message||"تعذر حفظ التذكير.";}finally{busy.value=false;}
}
function editReminder(item:StoredItem){
  if(!item.data?.dueAt)return;
  editing.value=item;
  reminderDraft.value={title:item.data.text,dueAt:item.data.dueAt,repeat:item.data.repeat||"none",advanceMinutes:item.data.advanceMinutes||0};
}
async function toggleDone(item:StoredItem){
  if(!item.data||busy.value)return;busy.value=true;
  try{const data={...item.data,reminderStatus:item.data.reminderStatus==="done"?"pending":"done"} as MemoryItem;await pushEncrypted("memory",item.id,data,item.revision);if(data.reminderStatus==="done")await cancelNotifications(item.id);else notice.value=await scheduleNotifications(item.id,data);await load();}
  catch(e:any){error.value=e?.message||"تعذر تحديث حالة التذكير.";}finally{busy.value=false;}
}
async function deleteItem(item:StoredItem){
  if(busy.value||!confirm("هل تريد حذف هذا العنصر نهائيًا من ذاكرتك؟"))return;busy.value=true;
  try{await cancelNotifications(item.id);await pushEncrypted("memory",item.id,{},item.revision,true);notice.value="تم حذف العنصر وإلغاء إشعاراته.";await load();}
  catch(e:any){error.value=e?.message||"تعذر حذف العنصر.";}finally{busy.value=false;}
}
onMounted(load);
</script>

<template>
  <main class="lv-assistant" dir="rtl">
    <header class="lv-assistant-top"><RouterLink to="/dashboard" class="lv-back">← لوحة التحكم</RouterLink><div class="lv-vault-brand"><span>✦</span><b>LifeVault <em>AI</em></b></div></header>
    <section class="lv-assistant-hero"><span class="lv-vault-kicker">YOUR PERSONAL MEMORY</span><h1>مساعد <span>LifeVault</span></h1><p>احفظ معلوماتك مشفّرة، وأنشئ تذكيرات بوقت محدد وتكرار وتنبيه مسبق.</p><div class="lv-assistant-badge">✦ حفظ خاص ومشفّر من جهازك</div></section>
    <section class="lv-capture"><label for="memory-input">ما الذي تريد أن تتذكره؟</label><textarea id="memory-input" v-model="draft" rows="4" maxlength="5000" placeholder="مثال: فكرني بتجديد الجواز يوم 15/12/2027 الساعة 8 مساءً"></textarea><div class="lv-capture-foot"><small>{{ draft.length }} / 5000</small><button class="lv-add" :disabled="!draft.trim()||busy" @click="saveMemory">{{busy?"جارٍ الحفظ...":"احفظ في ذاكرتي ✦"}}</button></div><p class="lv-assistant-hint">يدعم التواريخ الرقمية وعبارات اليوم/غدًا وبعد مدة وبعض صيغ الوقت. راجع الموعد قبل التأكيد. الإشعار لا يعرض تفاصيلك.</p></section>
    <section v-if="reminderDraft" class="lv-capture lv-reminder-preview" aria-live="polite">
      <span class="lv-vault-kicker">REMINDER REVIEW</span><h2>{{editing?"تعديل التذكير":"مراجعة التذكير"}}</h2>
      <label>عنوان التذكير</label><input v-model="reminderDraft.title" maxlength="300">
      <label>التاريخ والوقت</label><input type="datetime-local" :value="new Date(reminderDraft.dueAt).getFullYear()+'-'+String(new Date(reminderDraft.dueAt).getMonth()+1).padStart(2,'0')+'-'+String(new Date(reminderDraft.dueAt).getDate()).padStart(2,'0')+'T'+String(new Date(reminderDraft.dueAt).getHours()).padStart(2,'0')+':'+String(new Date(reminderDraft.dueAt).getMinutes()).padStart(2,'0')" @input="(e:any)=>{const d=new Date(e.target.value);if(!isNaN(d.getTime()))reminderDraft!.dueAt=d.toISOString()}">
      <label>التكرار</label><select v-model="reminderDraft.repeat"><option value="none">بدون تكرار</option><option value="daily">يومي</option><option value="weekly">أسبوعي</option><option value="monthly">شهري</option></select>
      <label>تنبيه مسبق</label><select v-model.number="reminderDraft.advanceMinutes"><option :value="0">بدون</option><option :value="10">قبل 10 دقائق</option><option :value="30">قبل 30 دقيقة</option><option :value="60">قبل ساعة</option><option :value="1440">قبل يوم</option></select>
      <strong>{{new Date(reminderDraft.dueAt).toLocaleString('ar-SA',{dateStyle:'full',timeStyle:'short'})}}</strong>
      <div class="lv-capture-foot"><button class="lv-cancel" @click="reminderDraft=null;editing=null">إلغاء</button><button class="lv-add" :disabled="busy||!reminderDraft.title.trim()||new Date(reminderDraft.dueAt)<=new Date()" @click="confirmReminder">{{busy?"جارٍ الحفظ...":"تأكيد وحفظ التذكير"}}</button></div>
    </section>
    <p v-if="notice" class="lv-assistant-success" role="status">{{notice}}</p><p v-if="error" class="lv-vault-error" role="alert">{{error}}</p>
    <section class="lv-memory-section"><div class="lv-memory-heading"><div><span class="lv-vault-kicker">YOUR SAVED NOTES</span><h2>ذاكرتك المحفوظة</h2></div><input v-model="query" aria-label="بحث في الذكريات" placeholder="ابحث في ذكرياتك..."></div>
      <div v-if="visibleItems.length" class="lv-memory-list"><article v-for="item in visibleItems" :key="item.id" class="lv-memory-card"><div><span class="lv-memory-category">{{item.data?.kind==='reminder'?'تذكير':item.data?.category}}</span><time>{{item.data?.createdAt?new Date(item.data.createdAt).toLocaleString('ar-SA'):''}}</time></div><p>{{item.data?.text}}</p>
      <template v-if="item.data?.kind==='reminder'"><p class="lv-reminder-date">الموعد: {{new Date(item.data.dueAt||'').toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'})}} · {{item.data.repeat==='daily'?'يومي':item.data.repeat==='weekly'?'أسبوعي':item.data.repeat==='monthly'?'شهري':'مرة واحدة'}} · {{item.data.reminderStatus==='done'?'مكتمل':'قيد الانتظار'}}</p><button class="lv-cancel" @click="toggleDone(item)">{{item.data.reminderStatus==='done'?'إعادة التفعيل':'تم'}}</button><button class="lv-add" @click="editReminder(item)">تعديل</button></template>
      <button class="lv-cancel" @click="deleteItem(item)">حذف</button></article></div>
      <div v-else class="lv-vault-empty"><span class="lv-empty-symbol">✧</span><b>{{query?"لا توجد نتائج مطابقة":"ذاكرتك تبدأ من هنا"}}</b><small>{{query?"جرّب كلمات بحث أخرى.":"احفظ أول معلومة لتجدها هنا لاحقًا."}}</small></div>
    </section>
    <footer class="lv-vault-footer"><span>LifeVault AI · ذاكرتك ملكك</span><span>لا نرسل النص إلى خدمة ذكاء اصطناعي خارجية في هذه النسخة.</span></footer>
  </main>
</template>
