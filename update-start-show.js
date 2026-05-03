const fs = require('fs');
let content = fs.readFileSync('app/dashboard/start-show/StartShowClient.tsx', 'utf-8');

content = content.replace(/(\s*)if \(disco2CanvasRef\.current && stageRef\.current\?\.contains\(disco2CanvasRef\.current\)\) \{\s*stageRef\.current\.removeChild\(disco2CanvasRef\.current\)\s*\}\s*disco2CanvasRef\.current = null\s*disco2StateRef\.current = null/g, 
`$&

$1if (disco3CacheRef.current) {
$1  disposeDisco3Scene(disco3CacheRef.current)
$1  if (stageRef.current?.contains(disco3CacheRef.current.renderer.domElement)) {
$1    stageRef.current.removeChild(disco3CacheRef.current.renderer.domElement)
$1  }
$1  disco3CacheRef.current = null
$1}`);

content = content.replace(/(\s*)if \(disco2CanvasRef\.current && stageRef\.current\.contains\(disco2CanvasRef\.current\)\) \{\s*stageRef\.current\.removeChild\(disco2CanvasRef\.current\)\s*\}\s*disco2CanvasRef\.current = null\s*disco2StateRef\.current = null/g, 
`$&

$1if (disco3CacheRef.current) {
$1  disposeDisco3Scene(disco3CacheRef.current)
$1  if (stageRef.current?.contains(disco3CacheRef.current.renderer.domElement)) {
$1    stageRef.current.removeChild(disco3CacheRef.current.renderer.domElement)
$1  }
$1  disco3CacheRef.current = null
$1}`);

fs.writeFileSync('app/dashboard/start-show/StartShowClient.tsx', content);
console.log('done');