/* 公开演示专用虚构数据。 */
window.PM_SEED = {
 version: 1,
 projects: [
 {id:'P-101',name:'协作工作台改版',owner:'成员 A',due:'2026-11-06',goal:'让团队在一个工作台查看任务、交付结果和待处理风险。',category:'产品体验',color:'teal'},
 {id:'P-102',name:'知识中心上线',owner:'成员 B',due:'2026-11-12',goal:'统一团队知识分类，让新成员快速找到操作指引。',category:'知识管理',color:'purple'},
 {id:'P-103',name:'客户反馈工作流',owner:'成员 C',due:'2026-10-25',goal:'把反馈关联到处理任务，并让提报人看到结果。',category:'服务体验',color:'amber'},
 {id:'P-104',name:'移动端体验计划',owner:'成员 A',due:'2026-11-20',goal:'核对小屏幕下的任务查看与处理流程。',category:'产品体验',color:'blue'},
 {id:'P-105',name:'设计资源整理',owner:'成员 B',due:'2026-10-28',goal:'建立可复用的组件示例和使用规范。',category:'团队建设',color:'purple'},
 {id:'P-106',name:'服务月报自动化',owner:'成员 C',due:'2026-11-18',goal:'用统一指标生成每月服务报告。',category:'运营支持',color:'teal'},
 {id:'P-107',name:'新人上手指南',owner:'成员 A',due:'2026-11-10',goal:'让新成员在第一周独立完成常用工作。',category:'团队建设',color:'blue'}
 ],
 tasks: [
 {id:'T-101',project:'P-101',name:'确认导航与信息层级',owner:'成员 A',priority:'P1',due:'2026-10-26',status:'已完成',dependency:'',checks:[{text:'项目与任务入口可互相返回',done:true}]},
 {id:'T-102',project:'P-101',name:'工作台交互联调',owner:'成员 B',priority:'P0',due:'2026-10-30',status:'待验收',dependency:'T-101',checks:[{text:'查询条件与列表结果一致',done:false},{text:'空结果可以重置恢复',done:false},{text:'跨页返回后数据保持一致',done:false}]},
 {id:'T-103',project:'P-101',name:'发布体验版本',owner:'成员 C',priority:'P1',due:'2026-11-06',status:'待开始',dependency:'T-102',checks:[{text:'体验版本可完成项目到任务的主流程',done:false}]},
 {id:'T-104',project:'P-101',name:'整理键盘操作规范',owner:'成员 A',priority:'P2',due:'2026-11-03',status:'进行中',dependency:'',checks:[{text:'弹窗支持键盘进入和退出',done:false}]},
 {id:'T-201',project:'P-102',name:'梳理文档目录',owner:'成员 B',priority:'P1',due:'2026-10-29',status:'已完成',dependency:'',checks:[{text:'每类文档都有归属',done:true}]},
 {id:'T-202',project:'P-102',name:'实现全文检索',owner:'成员 C',priority:'P0',due:'2026-11-10',status:'进行中',dependency:'T-201',checks:[{text:'结果可打开对应文档',done:false}]},
 {id:'T-301',project:'P-103',name:'确认反馈分类',owner:'成员 C',priority:'P1',due:'2026-10-23',status:'已完成',dependency:'',checks:[{text:'分类无重复',done:true}]},
 {id:'T-302',project:'P-103',name:'打通反馈处理通知',owner:'成员 A',priority:'P0',due:'2026-10-25',status:'进行中',dependency:'T-301',checks:[{text:'处理结果关联到原反馈',done:false}]},
 {id:'T-401',project:'P-104',name:'盘点移动端关键场景',owner:'成员 A',priority:'P1',due:'2026-11-13',status:'待开始',dependency:'',checks:[{text:'覆盖查询与任务查看',done:false}]},
 {id:'T-501',project:'P-105',name:'归档基础组件',owner:'成员 B',priority:'P1',due:'2026-10-24',status:'已完成',dependency:'',checks:[{text:'组件样例可打开',done:true}]},
 {id:'T-502',project:'P-105',name:'确认组件使用规范',owner:'成员 B',priority:'P2',due:'2026-10-28',status:'已完成',dependency:'T-501',checks:[{text:'使用边界已写入规范',done:true}]},
 {id:'T-601',project:'P-106',name:'确定月报指标',owner:'成员 C',priority:'P1',due:'2026-11-04',status:'进行中',dependency:'',checks:[{text:'指标来源和计算方式一致',done:false}]}
 ]
};
const demoShiftDate=value=>{const d=new Date(value+'T12:00:00');const now=new Date();const anchor=new Date(2026,9,27,12);const day=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);d.setDate(d.getDate()+Math.round((day-anchor)/86400000));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
window.PM_SEED.projects.forEach(p=>p.due=demoShiftDate(p.due));
window.PM_SEED.tasks.forEach(t=>t.due=demoShiftDate(t.due));
window.PM_SEED.tasks.forEach(t=>t.logs=[{at:demoShiftDate('2026-10-24')+' 09:30:00',actor:'项目管理员',text:'导入演示任务，当前状态：'+t.status}]);
