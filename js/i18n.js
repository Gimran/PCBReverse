/* ---------- language: EN (default) / RU. Markup is written in Russian and translated by I18N at start;
   dynamic strings use L(ru,en). Switching saves the state and reloads the page. ---------- */
const LANGKEY='pcbr-lang';
let LANG='en'; try{ if(localStorage.getItem(LANGKEY)==='ru') LANG='ru'; }catch(err){}
const L=(ru,en)=>LANG==='ru'?ru:en, LOC=L('ru-RU','en-GB');
const I18N={
  'ВИД':'VIEW','СЛОЙ':'LAYER','ДЕФОРМ':'WARP','КОМП':'PARTS','СЛОИ':'LAYERS','ВИДЕО':'VIDEO',
  'вид отображения':'display','активный слой: выравнивание, удаление фона':'active layer: alignment, background removal',
  'деформация по опорным точкам':'warp by reference points','компоненты':'components','клавиши':'keys',
  'ширина панели; двойной клик — по умолчанию':'panel width; double-click — default',
  'Вид отображения':'Display','Перевернуть плату (F)':'Flip board (F)','Показать':'Show',
  'точки всех NET':'points of all NETs','все компоненты':'all components','Вид':'View',
  'повернуть вид на 90° влево (Shift+R)':'rotate view 90° left (Shift+R)','повернуть вид на 90° вправо (R)':'rotate view 90° right (R)',
  'отразить вид по горизонтали (H)':'mirror view horizontally (H)','отразить вид по вертикали (V)':'mirror view vertically (V)',
  '⇄ вид':'⇄ view','⇅ вид':'⇅ view','сбросить поворот и отражения':'reset rotation and mirroring','сброс вида':'reset view',
  'вписать':'fit','сетка 32 px':'grid 32 px','инверсия цветов':'invert colors','градации серого':'grayscale',
  'все слои в градациях серого — разметка остаётся цветной':'all layers in grayscale — the markup stays in colour',
  'Состояние':'State','Автосохранение включено.':'Autosave is on.','Указать файлы…':'Locate files…','Сохранить без них':'Save without them',
  '*.pcbr — zip без сжатия: project.json (слои, деформация, NET, компоненты, вид) + оригиналы картинок':
    '*.pcbr — uncompressed zip: project.json (layers, warp, NETs, components, view) + original images',
  'Сохранить проект':'Save project','открыть *.pcbr (или старый JSON-экспорт)':'open *.pcbr (or an old JSON export)',
  'Загрузить проект':'Open project','записать состояние в браузер сейчас (автосохранение и так включено)':'write the state to the browser now (autosave is on anyway)',
  'Сохранить сейчас':'Save now',
  'пустой проект: слои TOP main / BOT main без картинок; текущие слои, картинки, NET и компоненты удаляются из браузера (с подтверждением)':
    'empty project: TOP main / BOT main layers without images; current layers, images, NETs and components are removed from the browser (asks first)',
  'Новый проект':'New project',
  'клик — плавное мигание активного слоя (100% ⇄ 0)':'click — smooth blinking of the active layer (100% ⇄ 0)',
  'период плавного мигания: клик по значению прозрачности (слой, сторона, видео) и опорные точки':
    'smooth blinking period: a click on an opacity value (layer, side, video) and the reference points','Папка':'Folder','Рабочая папка…':'Working folder…','Подключить':'Connect','Отключить':'Disconnect',
  'рабочая папка проекта: project.json + images/; пустая — текущий проект запишется в неё, с проектом — он откроется; дальше всё сохраняется туда само':
    'project working folder: project.json + images/; an empty one gets the current project, one with a project opens it; then everything is saved there by itself',
  'браузер спрашивает доступ к папке один раз за сессию':'the browser asks for folder access once per session',
  'больше не сохранять в папку (проект в ней остаётся)':'stop saving to the folder (the project stays there)',
  'Выравнивание активного слоя':'Active layer alignment','угол':'angle','угол, °; Enter — применить':'angle, °; Enter — apply',
  'масшт':'scale','масштаб; Enter — применить':'scale; Enter — apply',
  'рамка: масштаб / вращение (клик по слою переключает), ⊕ — центр, внутри — сдвиг':'frame: scale / rotate (click the layer to toggle), ⊕ — pivot, inside — move',
  'Ручная деформация (M)':'Free transform (M)',
  'обрезать слой: тянуть стороны и углы рамки, внутри — сдвиг рамки':'crop the layer: drag frame sides and corners, inside — move the frame',
  'Кроп слоя':'Crop layer','сброс слоя':'reset layer','сброс кропа':'reset crop',
  'Удаление фона':'Background removal','сделать прозрачным цвет фона активного слоя':'make the background color of the active layer transparent',
  'удалить фон':'remove bg','цвет фона':'background color','пипетка: взять цвет с экрана':'eyedropper: pick a color from the screen',
  'пипетка':'eyedropper','допуск':'tol',
  'Для наложения пинаутов из документации: фон картинки становится прозрачным.':'For overlaying pinouts from datasheets: the image background becomes transparent.',
  'Коррекция цвета':'Color correction','Ч/Б, контраст, резкость — читаемость подписей':'B/W, contrast, sharpness — legible markings',
  'подписи':'markings','как «подписи» + чёрн 100% + тонировка слоя «осветление» 100% цветом тонировки':'like “markings” + black 100% + layer tint “screen” 100% in the tint color',
  'ЦВ подписи':'color markings','Ч/Б в два уровня — только тёмное/светлое':'two-level B/W — dark / light only','порог Ч/Б':'B/W threshold','сброс':'reset',
  'Деформация по опорным точкам':'Warp by reference points','Задать точки':'Set points','мигание':'blink','модель':'model',
  'аффинная — скан, гербер':'affine — scan, Gerber','перспектива — фото под углом (≥4 точек)':'perspective — angled photo (≥4 points)',
  'Применить':'Apply','Отменить точку':'Undo point','Очистить точки':'Clear points','Снять деформацию':'Remove warp',
  'Масштаб платы':'Board scale','эталон':'gauge','px/мм':'px/mm','Калибровать':'Calibrate','Готово':'Done',
  'Поставить компонент':'Place component','R · резистор':'R · resistor','C · конденсатор':'C · capacitor','корпус':'package','сторона':'side',
  'U · микросхема / разъём':'U · IC / connector','пады ставятся по прямоугольнику, который растягивается мышью':'pads are placed along a rectangle you drag with the mouse',
  'Q · транзистор SOT-23':'Q · transistor SOT-23',
  'SOT-23 / SC-70: пады ставятся рамкой по крайним выводам, как у микросхемы — размер корпуса любой':
    'SOT-23 / SC-70: pads are placed with a frame over the outer pins, like an IC — any body size',
  'паттерн':'pattern','выводы':'pins','число выводов':'number of pins',
  'номер первого вывода разъёма (с него начинается нумерация)':'number of the first connector pin (numbering starts here)','Поставить':'Place',
  'редактирование компонентов: выбор, перетаскивание, поворот, удаление':'edit components: select, move, rotate, delete','Правка (K)':'Edit (K)',
  'ставить новые компоненты выбранного типа; Esc или повторное нажатие — закончить':'place new components of the chosen type; Esc or press again — finish',
  'Редактирование компонентов (K)':'Edit components (K)','Свойства выбранного':'Selected part','Компонент не выбран.':'No component selected.',
  'РИС':'DRAW','надписи и фигуры':'labels and shapes','Рисование (D)':'Drawing (D)',
  'надписи, стрелки, прямоугольники, круги поверх платы':'labels, arrows, rectangles, circles over the board',
  'выбор: клик — выбрать, тянуть — двигать, маркеры — менять форму':'select: click — pick, drag — move, handles — reshape',
  'надпись: клик — поставить, текст — во вкладке PROP':'label: click — place, text — in the PROP tab',
  'стрелка: тянуть от начала к острию':'arrow: drag from tail to tip','прямоугольник: тянуть по диагонали':'rectangle: drag along the diagonal',
  'круг: тянуть от центра':'circle: drag from the centre','цвет':'color','линия':'line','текст':'text',
  'цвет новых фигур и выбранной':'color of new shapes and the selected one','рисунки':'drawings',
  'свойства выбранного: компонент, точка NET, NET, рисунок':'selection properties: component, NET point, NET, drawing',
  'Ничего не выбрано — выберите компонент, точку NET или рисунок.':'Nothing selected — pick a component, a NET point or a drawing.',
  'Компонент':'Component','Точка NET':'NET point','Рисунок':'Drawing',
  'цвет компонентов top':'top component color','цвет компонентов bot':'bot component color','актив: —':'active: —',
  'экспериментально: камера / USB-микроскоп':'experimental: camera / USB microscope',
  'новый слой на текущей стороне платы; сразу выбрать картинку':'new layer on the current board side; pick an image right away',
  '+ Добавить слой':'+ Add layer','Режим просмотра':'View mode','все включённые слои текущей стороны платы':'all enabled layers of the current board side',
  'только активный слой':'active layer only','актив':'active','шторка':'swipe',
  'прозрачность стороны в просмотре при XRAY, %; другая сторона — 100%':'opacity of the side in view under XRAY, %; the other side — 100%',
  'рентген: показывать слои и компоненты обеих сторон, независимо от переворота платы (поверх любого режима)':
    'X-ray: show layers and components of both sides regardless of board flip (on top of any mode)',
  'Опора':'Ref','настройки активного слоя':'active layer settings','отразить по горизонтали':'mirror horizontally','отразить по вертикали':'mirror vertically',
  'цвет слоя (метка) и тонировки':'layer color (tag) and tint','режим тонировки':'tint mode','повернуть −90°':'rotate −90°','повернуть +90°':'rotate +90°',
  'Редактирование NET (N)':'Edit NETs (N)','новый NET':'new NET','удалить выбранную точку':'delete the selected point','− точка':'− point',
  'удалить все точки активного NET':'delete all points of the active NET','очистить':'clear','подписи точек':'point labels',
  'NETS · клик подсвечивает точки':'NETS · click highlights points'
};
function i18nStatic(){
  if(LANG==='ru') return;
  const tr=v=>{ const k=v.trim(); return k&&I18N[k]?v.replace(k,I18N[k]):v; };
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>
    n.parentElement.closest('script,style,[data-only]')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  for(let n;(n=w.nextNode());) n.nodeValue=n.parentElement.dataset.en||tr(n.nodeValue);
  document.querySelectorAll('[title]').forEach(el=>el.title=tr(el.title));
}
i18nStatic();
document.title=L('PCBReverse — совмещение сторон платы','PCBReverse — PCB layer overlay');
