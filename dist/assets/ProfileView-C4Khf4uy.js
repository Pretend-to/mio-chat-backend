import{_ as h,k as l,c as f,a as t,t as _,n as m,g as i,e as n,f as a,r as p,o as C,p as g,i as y}from"./index-Ck2D_opc.js";const D={data(){const e=parseInt(this.$route.params.id);return{activeContactor:l.getContactor(e),currentDelay:0,centerDialogVisible:!1}},mounted(){setInterval(()=>{this.currentDelay=l.socket.delay},3e3)},computed:{getDelayStatus(){return this.currentDelay>1e3?"high":this.currentDelay>500?"mid":this.currentDelay>100?"low":"ultra"}},watch:{"$route.params.id"(e){this.activeContactor=l.getContactor(e)}},methods:{delContactor(){this.centerDialogVisible=!1,l.rmContactor(this.activeContactor.id),this.$router.push("/contactors")}}},d=e=>(g("data-v-722c2a5e"),e=e(),y(),e),V={id:"profile"},b={class:"profile-container"},k={class:"base-info"},I={class:"base-info-avatar"},w=["src"],S={class:"base-info-content"},x={class:"name"},B={class:"id"},N={class:"status"},$=d(()=>t("div",{class:"more-info"},null,-1)),z=d(()=>t("div",{class:"extra-info"},null,-1)),E={class:"action-bar"},P=d(()=>t("span",null," 确认要删除此好友吗？该操作不可逆。 ",-1)),T={class:"dialog-footer"};function U(e,o,j,q,s,u){const c=p("el-button"),v=p("el-dialog");return C(),f("div",V,[t("div",b,[t("div",k,[t("div",I,[t("img",{src:s.activeContactor.avatar},null,8,w)]),t("div",S,[t("div",x,_(s.activeContactor.name),1),t("div",B,"ID "+_(s.activeContactor.id),1),t("div",N,[t("span",{class:m("delay-status "+u.getDelayStatus)},null,2),i(" 在线 ")])])]),$,z,t("div",E,[n(c,{onClick:o[0]||(o[0]=r=>e.$router.push(`/chat/${s.activeContactor.id}`)),type:"primary"},{default:a(()=>[i("发送消息")]),_:1}),n(c,{onClick:o[1]||(o[1]=r=>s.centerDialogVisible=!0),type:"danger"},{default:a(()=>[i("删除好友")]),_:1}),n(v,{modelValue:s.centerDialogVisible,"onUpdate:modelValue":o[3]||(o[3]=r=>s.centerDialogVisible=r),title:"警告",width:"300",center:""},{footer:a(()=>[t("div",T,[n(c,{onClick:o[2]||(o[2]=r=>s.centerDialogVisible=!1)},{default:a(()=>[i("取消")]),_:1}),n(c,{type:"primary",onClick:u.delContactor},{default:a(()=>[i(" 确认 ")]),_:1},8,["onClick"])])]),default:a(()=>[P]),_:1},8,["modelValue"])])])])}const F=h(D,[["render",U],["__scopeId","data-v-722c2a5e"]]);export{F as default};