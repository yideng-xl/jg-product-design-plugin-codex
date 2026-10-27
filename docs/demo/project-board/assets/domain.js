/* 统一业务规则；界面与验证共用。 */
(function(root){
 'use strict';
 const owners=['成员 A','成员 B','成员 C'];
 const states=['待开始','进行中','待验收','已完成'];
 const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 function summary(data,p,day=today()){
  const tasks=data.tasks.filter(t=>t.project===p.id),done=tasks.filter(t=>t.status==='已完成').length;
  const status=tasks.length&&done===tasks.length?'已完成':!tasks.length||tasks.every(t=>t.status==='待开始')?'待启动':'进行中';
  return {tasks,done,total:tasks.length,progress:tasks.length?Math.round(done/tasks.length*100):0,status,overdue:status!=='已完成'&&p.due<day};
 }
 function projectErrors(data,f,day=today()){
  const e={};const name=(f.name||'').trim(),goal=(f.goal||'').trim();
  if(!name||name.length>50)e.name='请输入 1–50 字的项目名称';
  else if(data.projects.some(p=>p.name.toLowerCase()===name.toLowerCase()))e.name='项目名称已存在，请换一个名称';
  if(!owners.includes(f.owner))e.owner='请选择项目负责人';
  if(!validDate(f.due)||f.due<day)e.due='请选择不早于当天的截止日期';
  if(!goal||goal.length>300)e.goal='请输入 1–300 字的项目目标';return e;
 }
 function taskErrors(data,p,f,id='',day=today()){
  const e={},name=(f.name||'').trim();
  if(!name||name.length>50)e.name='请输入 1–50 字的任务名称';
  else if(data.tasks.some(t=>t.project===p.id&&t.id!==id&&t.name.toLowerCase()===name.toLowerCase()))e.name='当前项目中已存在同名任务';
  if(!owners.includes(f.owner))e.owner='请选择任务负责人';
  if(!validDate(f.due)||f.due<day||f.due>p.due)e.due=`截止日期应在 ${day} 至 ${p.due} 之间`;
  if(!['P0','P1','P2'].includes(f.priority))e.priority='请选择有效的优先级';
  if(!id){if(!(f.acceptance||'').trim()||f.acceptance.trim().length>300)e.acceptance='请输入 1–300 字的验收要求';
  if(f.dependency&&!data.tasks.some(t=>t.id===f.dependency&&t.project===p.id))e.dependency='请选择当前项目的前置任务';}return e;
 }
 function reason(data,t,action,role){
  if(role!=='manager')return '访客只有查看权限';
  if(action==='edit')return ['待开始','进行中'].includes(t.status)?'':'当前状态不允许编辑';
  const needed={start:'待开始',submit:'进行中',complete:'待验收',reject:'待验收',check:'待验收'};
  if(!needed[action]||t.status!==needed[action])return '任务状态已变化，当前操作不可用';
  if(action==='start'&&t.dependency){const dep=data.tasks.find(x=>x.id===t.dependency);if(!dep||dep.status!=='已完成')return '前置任务尚未完成';}
  if(action==='complete'&&(!t.checks.length||!t.checks.every(c=>c.done)))return '请先核对全部验收项';return '';
 }
 function transition(data,t,action,role,note=''){
  const error=reason(data,t,action,role);if(error)return error;
  if(action==='reject'&&(!note.trim()||note.trim().length>300))return '请输入 1–300 字的退回原因';
  const next={start:'进行中',submit:'待验收',complete:'已完成',reject:'进行中'}[action];
  if(!next)return '不支持的操作';t.status=next;if(action==='reject')t.checks.forEach(c=>c.done=false);return '';
 }
 root.PM={owners,states,today,summary,projectErrors,taskErrors,reason,transition};
 if(typeof module!=='undefined')module.exports=root.PM;
})(typeof window!=='undefined'?window:globalThis);
