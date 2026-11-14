// usage: node html2txt.js url out.txt
const [,,url,out]=process.argv;
fetch(url,{headers:{'User-Agent':'Mozilla/5.0 FireGuard-hackathon'}}).then(r=>r.text()).then(h=>{
  h=h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>|<header[\s\S]*?<\/header>/gi,' ');
  let t=h.replace(/<\/(p|h\d|li|div|tr)>/gi,'\n').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ')
   .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#8217;|&rsquo;/g,"'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g,'"').replace(/&#8211;|&#8212;|&ndash;|&mdash;/g,'-').replace(/&#\d+;/g,' ')
   .split('\n').map(s=>s.replace(/\s+/g,' ').trim()).filter(s=>s.length>30).join('\n');
  require('fs').writeFileSync(out,'SOURCE: '+url+'\n'+t); console.log(out,t.length);
});
