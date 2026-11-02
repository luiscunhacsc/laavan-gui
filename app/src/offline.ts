export type OfflineState='preparing'|'ready'|'failed'|'update';
export function enableOffline(report:(state:OfflineState)=>void){
 // The desktop distribution already contains every application asset.
 if ('formaDesktop' in window) { report('ready'); return; }
 if(!('serviceWorker' in navigator)){report('failed');return;}
 report('preparing');
 void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL}).then(reg=>{
  if(reg.active)report('ready');if(reg.waiting)report('update');
  const watch=()=>{const worker=reg.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='activated')report('ready');if(worker.state==='installed'&&navigator.serviceWorker.controller)report('update');if(worker.state==='redundant')report('failed');});};
  watch();reg.addEventListener('updatefound',watch);
 }).catch(()=>report('failed'));
}
