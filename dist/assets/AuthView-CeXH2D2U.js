import{_,q as l,s as p,u as h,c as f,a as s,w,v as k,x as m,k as g,E as v,y,o as E,p as x,i as C}from"./index-Ck2D_opc.js";const r=t=>(x("data-v-761c7cb9"),t=t(),C(),t),b={class:"auth-view"},I={class:"container"},L=r(()=>s("i",{class:"iconfont ChatGPT"},null,-1)),V=[L],B=r(()=>s("h1",{class:"title"},"登录验证",-1)),M=r(()=>s("p",{class:"hint"},"管理员开启了密码验证，请在下方填入访问码",-1)),S={class:"controls"},T={__name:"AuthView",setup(t){const o=l(),a=l(!1),d=l(),i=async n=>{if(console.log("触发login了"),await m(()=>d.value.classList.add("active")),!a.value){a.value=!0;try{const e=await g.login(n);e&&(v.success(`成功以${e.is_admin?"管理员身份":"游客身份"}登录，欢迎使用!`),await y.push("/"))}catch(e){v.error(e)}a.value=!1}};function u(n){n.key==="Enter"&&i(o.value)}return p(()=>{console.log("unmounted"),removeEventListener("keydown",u)}),h(()=>{addEventListener("keydown",u)}),(n,e)=>(E(),f("div",b,[s("div",I,[s("div",{class:"icon-container",ref_key:"iconContainer",ref:d},V,512),B,M,w(s("input",{type:"password","onUpdate:modelValue":e[0]||(e[0]=c=>o.value=c),placeholder:"在此处填写访问码"},null,512),[[k,o.value]]),s("div",S,[s("button",{class:"later",onClick:e[1]||(e[1]=c=>i())},"游客登录"),s("button",{class:"login",onClick:e[2]||(e[2]=c=>i(o.value))},"Login")])])]))}},q=_(T,[["__scopeId","data-v-761c7cb9"]]);export{q as default};