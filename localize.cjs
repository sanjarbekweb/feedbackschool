const fs=require('fs'), ts=require('typescript'), path=require('path');
const map=Object.entries(JSON.parse(fs.readFileSync('localize-map.json','utf8'))).sort((a,b)=>b[0].length-a[0].length);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of [...walk('apps/frontend/app'),...walk('apps/frontend/components'),...walk('apps/frontend/lib'),...walk('apps/backend/src/telegram')].filter(f=>/\.tsx?$/.test(f)&&!f.endsWith('.spec.ts'))){
 let src=fs.readFileSync(file,'utf8');const ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true);const edits=[];
 function visit(n){if(ts.isStringLiteral(n)||ts.isJsxText(n)||ts.isTemplateHead(n)||ts.isTemplateMiddle(n)||ts.isTemplateTail(n)||ts.isNoSubstitutionTemplateLiteral(n)){
  const a=n.getStart(ast),b=n.end;let text=src.slice(a,b);
  if(!text.includes('className') && !(ts.isStringLiteral(n)&&ts.isJsxAttribute(n.parent)&&!['title','placeholder','aria-label','description'].includes(n.parent.name.text))){
   for(const [en,uz]of map)text=text.replace(new RegExp('(?<![A-Za-z])'+en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![A-Za-z])','g'),uz);
   if(text!==src.slice(a,b))edits.push([a,b,text]);
  }
 }ts.forEachChild(n,visit);}visit(ast);for(const[a,b,t]of edits.sort((a,b)=>b[0]-a[0]))src=src.slice(0,a)+t+src.slice(b);fs.writeFileSync(file,src);
}
