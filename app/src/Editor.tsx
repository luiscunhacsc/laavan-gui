import {useEffect,useRef} from 'react';
import {EditorState,Compartment,Annotation,Transaction} from '@codemirror/state';
import {EditorView,keymap,lineNumbers,highlightActiveLine,drawSelection} from '@codemirror/view';
import {defaultKeymap,history,historyKeymap} from '@codemirror/commands';
import {StreamLanguage,syntaxHighlighting,HighlightStyle} from '@codemirror/language';
import {tags} from '@lezer/highlight';
import {autocompletion} from '@codemirror/autocomplete';
import {setDiagnostics,lintGutter} from '@codemirror/lint';
import en from './en.json';

// Display tokenisation only. Every model is parsed by lavaan itself in R.
const lavaan=StreamLanguage.define({token(stream){
  if(stream.eatSpace())return null;
  if(stream.peek()==='#'){stream.skipToEnd();return'comment';}
  if(stream.match(/^(=~|<~|~~|~1|~|:=|==|<=|>=|<|>|\|)/))return'operator';
  if(stream.match(/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?/))return'number';
  if(stream.match(/^(['"])(?:\\.|[^\\])*?\1/))return'string';
  if(stream.match(/^(NA|Inf|start|label|equal|c)\b/))return'keyword';
  if(stream.match(/^[\p{L}_.][\p{L}\p{N}_.]*/u))return'variableName';
  stream.next();return null;
}});
const highlight=HighlightStyle.define([
  {tag:tags.comment,color:'var(--syntax-comment)',fontStyle:'italic'},
  {tag:tags.operator,color:'var(--syntax-operator)',fontWeight:'600'},
  {tag:tags.number,color:'var(--syntax-number)'},
  {tag:tags.keyword,color:'var(--syntax-keyword)'},
  {tag:tags.string,color:'var(--syntax-string)'},
  {tag:tags.variableName,color:'var(--text)'}
]);
const external=Annotation.define<boolean>();
export default function Editor({value,onChange,onConvert,error,names,onUndo,onRedo,readOnly=false}:{value:string;onChange:(text:string)=>void;onConvert:()=>void;error:string;names:string[];onUndo?:()=>void;onRedo?:()=>void;readOnly?:boolean}){
  const host=useRef<HTMLDivElement>(null),view=useRef<EditorView>(null),callbacks=useRef({onChange,onConvert,onUndo,onRedo});
  callbacks.current={onChange,onConvert,onUndo,onRedo};
  const complete=useRef(new Compartment()),lock=useRef(new Compartment());
  useEffect(()=>{
    if(!host.current)return;
    const editor=new EditorView({parent:host.current,state:EditorState.create({doc:value,extensions:[lineNumbers(),history(),highlightActiveLine(),drawSelection(),lintGutter(),
      keymap.of([{key:'Mod-Enter',run:()=>{callbacks.current.onConvert();return true;}},{key:'Mod-z',run:()=>{if(!callbacks.current.onUndo)return false;callbacks.current.onUndo();return true;}},{key:'Mod-Shift-z',run:()=>{if(!callbacks.current.onRedo)return false;callbacks.current.onRedo();return true;}},{key:'Mod-y',run:()=>{if(!callbacks.current.onRedo)return false;callbacks.current.onRedo();return true;}},...defaultKeymap,...historyKeymap]),
      lavaan,syntaxHighlighting(highlight),EditorView.lineWrapping,
      EditorView.contentAttributes.of({'aria-label':en.syntax,spellcheck:'false'}),
      complete.current.of(autocompletion()),
      lock.current.of(EditorState.readOnly.of(readOnly)),
      EditorView.updateListener.of(update=>{if(update.docChanged&&!update.transactions.some(t=>t.annotation(external)))callbacks.current.onChange(update.state.doc.toString());}),
      EditorView.theme({'&':{height:'100%',fontSize:'13px',color:'var(--text)'},'.cm-scroller':{fontFamily:'"Cascadia Code", Consolas, monospace',lineHeight:'1.9'},'.cm-content':{padding:'22px 12px'},'.cm-gutters':{background:'transparent',border:'none',color:'var(--text-muted)'},'.cm-lineNumbers .cm-gutterElement':{padding:'0 10px 0 12px'},'.cm-activeLine':{background:'var(--surface-muted)'},'.cm-activeLineGutter':{background:'transparent'},'&.cm-focused':{outline:'none'},'.cm-cursor':{borderLeftColor:'var(--focus)'},'.cm-selectionBackground':{background:'var(--accent-border)!important'}})
    ]})});view.current=editor;return()=>editor.destroy();
  },[]);
  useEffect(()=>{view.current?.dispatch({effects:lock.current.reconfigure(EditorState.readOnly.of(readOnly))});},[readOnly]);
  useEffect(()=>{const v=view.current;if(v&&v.state.doc.toString()!==value)v.dispatch({changes:{from:0,to:v.state.doc.length,insert:value},annotations:[external.of(true),Transaction.addToHistory.of(false)]});},[value]);
  useEffect(()=>{const v=view.current;if(!v)return;const match=error.match(/line\s+(\d+)(?:,?\s*pos\s+(\d+))?/i);
    const line=match?Math.min(v.state.doc.lines,Number(match[1])):1,ln=v.state.doc.line(line),from=Math.min(ln.to,ln.from+Math.max(0,Number(match?.[2]||1)-1));
    v.dispatch(setDiagnostics(v.state,error?[{from,to:Math.min(v.state.doc.length,from+1),severity:'error',message:error}]:[]));
  },[error,value]);
  useEffect(()=>{const v=view.current;if(!v)return;v.dispatch({effects:complete.current.reconfigure(autocompletion({override:[context=>{
    const word=context.matchBefore(/[\w.]+/);if(!word||word.from===word.to&&!context.explicit)return null;
    return{from:word.from,options:[...new Set([...names,'NA','start','label'])].map(label=>({label,type:label==='NA'?'keyword':'variable'}))};
  }]}))});},[names]);
  return <div className="code-editor" ref={host}/>;
}
