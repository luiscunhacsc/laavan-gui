import type {Position,Box,SceneNode} from './model';
export const distance=(a:Position,b:Position)=>Math.hypot(a.x-b.x,a.y-b.y);
export function nodeBox(n:SceneNode,pad=0):Box{return {x:n.x-n.width/2-pad,y:n.y-n.height/2-pad,width:n.width+2*pad,height:n.height+2*pad};}
export function overlaps(a:Box,b:Box,pad=0){return a.x<b.x+b.width+pad&&a.x+a.width+pad>b.x&&a.y<b.y+b.height+pad&&a.y+a.height+pad>b.y;}
export function contains(b:Box,p:Position){return p.x>b.x+.01&&p.x<b.x+b.width-.01&&p.y>b.y+.01&&p.y<b.y+b.height-.01;}
export function segmentHitsBox(a:Position,b:Position,box:Box){
  const dx=b.x-a.x,dy=b.y-a.y;
  let lo=0,hi=1;
  for(const [p,q] of [[-dx,a.x-box.x],[dx,box.x+box.width-a.x],[-dy,a.y-box.y],[dy,box.y+box.height-a.y]]){
    if(Math.abs(p)<1e-8){if(q<0)return false;continue;}
    const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
    if(lo>hi)return false;
  }
  return hi>1e-5&&lo<1-1e-5;
}
export function segmentsCross(a:Position,b:Position,c:Position,d:Position){
  const cross=(p:Position,q:Position,r:Position)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  return cross(a,b,c)*cross(a,b,d)<-1e-4&&cross(c,d,a)*cross(c,d,b)<-1e-4;
}
export function parallelOverlap(a:Position,b:Position,c:Position,d:Position,tolerance=18){
  if(Math.abs(a.y-b.y)<.01&&Math.abs(c.y-d.y)<.01&&Math.abs(a.y-c.y)<tolerance)
    return Math.max(0,Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))-Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x)))*(1-Math.abs(a.y-c.y)/tolerance);
  if(Math.abs(a.x-b.x)<.01&&Math.abs(c.x-d.x)<.01&&Math.abs(a.x-c.x)<tolerance)
    return Math.max(0,Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y))-Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y)))*(1-Math.abs(a.x-c.x)/tolerance);
  return 0;
}
export function port(n:SceneNode,t:Position):Position {
  const dx=t.x-n.x,dy=t.y-n.y;
  if(!dx&&!dy)return {x:n.x+n.width/2,y:n.y};
  const scale=n.kind==='observed'?Math.min(n.width/2/Math.abs(dx||1e-9),n.height/2/Math.abs(dy||1e-9)):
    1/Math.sqrt((dx/(n.width/2))**2+(dy/(n.height/2))**2);
  return {x:n.x+dx*scale,y:n.y+dy*scale};
}
export function cubic(a:Position,b:Position,c:Position,d:Position,steps=48):Position[]{
  return Array.from({length:steps+1},(_,i)=>{const t=i/steps,u=1-t;return{x:u**3*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t**3*d.x,y:u**3*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t**3*d.y};});
}
export function polyLength(points:Position[]){return points.slice(1).reduce((s,p,i)=>s+distance(points[i],p),0);}
export function simplify(points:Position[]){return points.filter((p,i)=>!i||i===points.length-1||Math.abs((p.x-points[i-1].x)*(points[i+1].y-p.y)-(p.y-points[i-1].y)*(points[i+1].x-p.x))>.001);}
export function pathData(points:Position[],rounded=false){
  if(!points.length)return '';
  if(!rounded||points.length<3)return points.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  let d=`M ${points[0].x} ${points[0].y}`;
  for(let i=1;i<points.length-1;i++){
    const a=points[i-1],b=points[i],c=points[i+1],r=Math.min(14,distance(a,b)/3,distance(b,c)/3);
    const p={x:b.x+(a.x-b.x)*r/distance(a,b),y:b.y+(a.y-b.y)*r/distance(a,b)};
    const q={x:b.x+(c.x-b.x)*r/distance(b,c),y:b.y+(c.y-b.y)*r/distance(b,c)};
    d+=` L ${p.x} ${p.y} Q ${b.x} ${b.y} ${q.x} ${q.y}`;
  }
  const end=points.at(-1)!;return d+` L ${end.x} ${end.y}`;
}

class Heap {
  values:{index:number;cost:number}[]=[];
  push(v:{index:number;cost:number}){let i=this.values.length;this.values.push(v);while(i){const p=(i-1)>>1;if(this.values[p].cost<=v.cost)break;this.values[i]=this.values[p];i=p;}this.values[i]=v;}
  pop(){const result=this.values[0],last=this.values.pop()!;if(this.values.length){let i=0;while(i*2+1<this.values.length){let c=i*2+1;if(c+1<this.values.length&&this.values[c+1].cost<this.values[c].cost)c++;if(this.values[c].cost>=last.cost)break;this.values[i]=this.values[c];i=c;}this.values[i]=last;}return result;}
}
// Orthogonal visibility grid. No covariance is allowed through a node.
export function routeGrid(start:Position,end:Position,obstacles:Box[],avoid:[Position,Position][]=[]):Position[]|undefined {
  const xs=[start.x,end.x],ys=[start.y,end.y];
  for(const b of obstacles){xs.push(b.x-14,b.x+b.width+14);ys.push(b.y-14,b.y+b.height+14);}
  for(const [a,b] of avoid){xs.push(a.x-24,a.x+24,b.x-24,b.x+24);ys.push(a.y-24,a.y+24,b.y-24,b.y+24);}
  xs.push(Math.min(...xs)-70,Math.max(...xs)+70);ys.push(Math.min(...ys)-70,Math.max(...ys)+70);
  const X=[...new Set(xs.map(x=>Math.round(x*100)/100))].sort((a,b)=>a-b),Y=[...new Set(ys.map(y=>Math.round(y*100)/100))].sort((a,b)=>a-b);
  const nx=X.length,ny=Y.length;
  const sx=X.findIndex(x=>Math.abs(x-start.x)<.02),sy=Y.findIndex(y=>Math.abs(y-start.y)<.02);
  const ex=X.findIndex(x=>Math.abs(x-end.x)<.02),ey=Y.findIndex(y=>Math.abs(y-end.y)<.02);
  const first=sy*nx+sx,last=ey*nx+ex;
  const scores=new Float64Array(nx*ny).fill(Infinity),previous=new Int32Array(nx*ny).fill(-1),closed=new Uint8Array(nx*ny);
  const point=(i:number)=>({x:X[i%nx],y:Y[Math.floor(i/nx)]});
  const heap=new Heap();scores[first]=0;heap.push({index:first,cost:0});
  while(heap.values.length){
    const {index:i}=heap.pop();if(closed[i])continue;if(i===last){const out=[];for(let j=i;j!==-1;j=previous[j])out.push(point(j));return simplify(out.reverse());}
    closed[i]=1;const x=i%nx,y=Math.floor(i/nx),a=point(i);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      if(x+dx<0||x+dx>=nx||y+dy<0||y+dy>=ny)continue;
      const j=(y+dy)*nx+x+dx;if(closed[j])continue;const b=point(j);
      if(obstacles.some(o=>contains(o,b)||segmentHitsBox(a,b,o)))continue;
      const prev=previous[i]===-1?undefined:point(previous[i]);
      const turn=prev&&Math.abs((a.x-prev.x)*(b.y-a.y)-(a.y-prev.y)*(b.x-a.x))>.01?30:0;
      const repulsion=avoid.reduce((sum,[c,d])=>sum+parallelOverlap(a,b,c,d)*8+(segmentsCross(a,b,c,d)?120:0),0);
      const score=scores[i]+distance(a,b)+turn+repulsion;
      if(score<scores[j]){scores[j]=score;previous[j]=i;heap.push({index:j,cost:score+Math.abs(b.x-end.x)+Math.abs(b.y-end.y)});}
    }
  }
}
