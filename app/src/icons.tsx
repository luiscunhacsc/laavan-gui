const paths:Record<string,string>={
  cursor:'m5 3 14 9-7 1-3 7-4-17Z',observed:'M3 5h18v14H3V5Z',latent:'M21 12a9 6 0 1 1-18 0 9 6 0 0 1 18 0Z',loading:'M4 19 9 5h3l8 14M7 13h10',covariance:'M3 12c4-10 14-10 18 0M3 12V6m0 6 6-2m12 2V6m0 6-6-2',formative:'M3 5l12 7L3 19m12-7h6m-4-4 4 4-4 4',
  plus:'M12 5v14M5 12h14',download:'M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4',open:'M3 7h6l2-3h9v15H3V7Zm0 3h17',
  undo:'M9 4 4 9l5 5M4 9h9a6 6 0 0 1 0 12',redo:'m15 4 5 5-5 5m5-5h-9a6 6 0 0 0 0 12',fit:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 12h8m-4-4v8',
  refresh:'M20 7a9 9 0 1 0 1 8M20 3v5h-5',settings:'M4 7h16M4 17h16M9 4v6m6 4v6',code:'m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 18',
  close:'m6 6 12 12M18 6 6 18',check:'m5 12 4 4L19 6',chevron:'m9 5 7 7-7 7',table:'M3 4h18v16H3V4Zm0 6h18M9 4v16',copy:'M8 8h12v13H8V8ZM4 16V3h12',arrow:'M5 12h14m-5-5 5 5-5 5',info:'M12 11v6m0-11v1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',lock:'M6 11h12v10H6V11Zm3 0V7a3 3 0 0 1 6 0v4',save:'M4 3h13l3 3v15H4V3Zm4 0v7h8V3M8 21v-7h8v7'
};
export function Icon({name,size=18}:{name:string;size?:number}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.info}/></svg>;}
