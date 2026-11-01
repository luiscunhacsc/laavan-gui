import {AlignmentType,BorderStyle,Document,HeadingLevel,Packer,PageOrientation,Paragraph,Table,TableCell,TableLayoutType,TableRow,TextRun,WidthType,type ISectionOptions} from 'docx';
import {reportNotes,reportTables} from './report';
import type {AnalysisSnapshot} from './analysis';
import en from './en.json';
const none={style:BorderStyle.NONE,size:0,color:'FFFFFF'},rule={style:BorderStyle.SINGLE,size:6,color:'000000'};
export async function reportWord(snapshot:AnalysisSnapshot,stale=false):Promise<Blob>{
 const tables=reportTables(snapshot),sections:ISectionOptions[]=[{children:[new Paragraph({text:en.advanced.report,heading:HeadingLevel.TITLE}),...reportNotes(snapshot,stale).map(text=>new Paragraph({text,spacing:{after:160}}))]}];
 tables.forEach((t,i)=>{const wide=t.headers.length>7;
  const row=(values:string[],header=false,last=false)=>new TableRow({tableHeader:header,cantSplit:true,children:values.map((v,j)=>new TableCell({borders:{top:header?rule:none,bottom:header||last?rule:none,left:none,right:none},margins:{top:70,bottom:70,left:80,right:80},children:[new Paragraph({alignment:j>=4?AlignmentType.RIGHT:AlignmentType.LEFT,children:[new TextRun({text:v,bold:header,size:wide?18:22})]})]}))});
  sections.push({properties:{page:{size:{orientation:wide?PageOrientation.LANDSCAPE:PageOrientation.PORTRAIT},margin:{top:1440,right:1440,bottom:1440,left:1440}}},children:[
   new Paragraph({children:[new TextRun({text:`${en.advanced.table} ${i+1}`,bold:true})],spacing:{after:120},keepNext:true}),new Paragraph({children:[new TextRun({text:t.title,italics:true})],spacing:{after:160},keepNext:true}),
   new Table({width:{size:100,type:WidthType.PERCENTAGE},layout:TableLayoutType.AUTOFIT,borders:{top:none,bottom:none,left:none,right:none,insideHorizontal:none,insideVertical:none},rows:[row(t.headers,true),...t.rows.map((r,j)=>row(r,false,j===t.rows.length-1))]}),
   ...(t.note?[new Paragraph({children:[new TextRun({text:en.advanced.note+' ',italics:true}),new TextRun(t.note)],spacing:{before:160}})]:[])]});
 });
 return Packer.toBlob(new Document({creator:'Forma',title:en.advanced.report,styles:{default:{document:{run:{font:'Times New Roman',size:22},paragraph:{spacing:{line:276,after:80}}}}},sections}));
}
