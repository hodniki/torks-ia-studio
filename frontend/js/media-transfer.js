(function(){
  const open=()=>new Promise((resolve,reject)=>{const request=indexedDB.open('torks-media',1);request.onupgradeneeded=()=>request.result.createObjectStore('pending');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  async function action(mode,value){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('pending',mode==='get'?'readonly':'readwrite'),store=tx.objectStore('pending'),request=mode==='put'?store.put(value,'media'):mode==='delete'?store.delete('media'):store.get('media');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);tx.oncomplete=()=>db.close();});}
  window.TorksMedia={save:file=>action('put',{blob:file,name:file.name,type:file.type,lastModified:file.lastModified}),load:()=>action('get'),clear:()=>action('delete')};
})();
