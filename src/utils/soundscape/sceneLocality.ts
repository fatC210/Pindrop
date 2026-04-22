import type { AppLocale } from '@/i18n/types';
import type { LocationContext, SceneType } from '@/types/locationContext';
import type { NarrativeAnchorCue } from '@/types/soundscapeRecipe';
import type { TimeSlot } from '@/utils/timeSlot';

type SoundCue = NarrativeAnchorCue;
type TimeAwareCuePool = SoundCue[] | Partial<Record<TimeSlot, SoundCue[]>>;

interface SceneCuePalette {
  bed: TimeAwareCuePool;
  activity: TimeAwareCuePool;
  accent: TimeAwareCuePool;
}

function cue(prompt: string, en: string, zhCn: string): SoundCue {
  return {
    prompt,
    label: {
      en,
      'zh-CN': zhCn,
    },
  };
}

function allTimes(cues: SoundCue[]): Partial<Record<TimeSlot, SoundCue[]>> {
  return {
    dawn: cues,
    day: cues,
    dusk: cues,
    night: cues,
  };
}

const SCENE_LABELS: Record<SceneType, { en: string; 'zh-CN': string }> = {
  urban_main_road: { en: 'main urban road', 'zh-CN': '城市主干道' },
  commercial_district: { en: 'commercial street', 'zh-CN': '商业街区' },
  residential_block: { en: 'residential block', 'zh-CN': '居民街区' },
  park: { en: 'park path', 'zh-CN': '公园步道' },
  campus: { en: 'campus edge', 'zh-CN': '校园一角' },
  transit_hub: { en: 'station concourse', 'zh-CN': '车站出入口' },
  coastal_waterfront: { en: 'coastal promenade', 'zh-CN': '海边步道' },
  riverfront: { en: 'riverside walk', 'zh-CN': '沿河步道' },
  harbor: { en: 'harborfront', 'zh-CN': '港口岸线' },
  historic_quarter: { en: 'historic quarter', 'zh-CN': '老城街巷' },
  industrial_edge: { en: 'industrial edge', 'zh-CN': '工业区边缘' },
  rural_fields: { en: 'field edge', 'zh-CN': '田野边' },
  forest_path: { en: 'forest trail', 'zh-CN': '林间小径' },
  mountain_path: { en: 'mountain path', 'zh-CN': '山路' },
  open_water: { en: 'open water', 'zh-CN': '开阔水面' },
  polar_outpost: { en: 'polar outdoors', 'zh-CN': '极地户外' },
};

const SCENE_CUE_PALETTES: Record<SceneType, SceneCuePalette> = {
  urban_main_road: {
    bed: allTimes([
      cue(
        'steady lane-by-lane traffic wash under nearby signals',
        'steady traffic wash',
        '持续的车流底噪'
      ),
    ]),
    activity: {
      dawn: [
        cue('street sweepers and the first buses entering the avenue', 'street sweepers and first buses', '清扫车与最早一班公交'),
      ],
      day: [
        cue('crossing footsteps bunching up and releasing with the lights', 'crossing footsteps at the lights', '红绿灯口聚散的脚步声'),
      ],
      dusk: [
        cue('brakes tightening in waves as the junction fills up', 'waves of braking at the junction', '路口一阵阵收紧的刹车声'),
      ],
      night: [
        cue('thinner late traffic humming through longer red lights', 'late traffic humming through the lights', '深夜穿过长红灯的稀疏车流'),
      ],
    },
    accent: {
      dawn: [cue('a crosswalk beeper carrying across the emptier junction', 'a crosswalk beeper', '空旷路口的过街提示音')],
      day: [cue('bus brakes easing at the curb and doors folding open', 'bus brakes and doors', '公交刹车与车门开合')],
      dusk: [cue('one distant siren skimming past the traffic wash', 'a distant siren pass', '掠过车流底噪的一声远处警笛')],
      night: [cue('an occasional late horn clipped short by the buildings', 'an occasional late horn', '楼间一声偶发的夜间喇叭')],
    },
  },
  commercial_district: {
    bed: allTimes([
      cue(
        'continuous storefront footsteps and low retail murmur hugging the block',
        'storefront footsteps and retail murmur',
        '沿街店铺前的脚步与低声人群'
      ),
    ]),
    activity: {
      dawn: [cue('metal shutters rolling up and small delivery carts arriving', 'rolling shutters and delivery carts', '卷闸门拉起与送货小车')],
      day: [cue('bags, cups, and casual door chimes moving in and out of the street', 'shopping bags, cups, and door chimes', '购物袋、杯盘与门铃声')],
      dusk: [cue('restaurant terraces filling as cutlery and chairs lightly shift', 'terrace cutlery and shifting chairs', '餐桌餐具与椅脚轻挪声')],
      night: [cue('closing shutters and a few taxis drawing up to the curb', 'closing shutters and taxis', '收摊卷闸门与靠边的出租车')],
    },
    accent: {
      dawn: [cue('one crate being set down outside a just-opened shop', 'one crate outside a shop', '店门口放下一只货箱')],
      day: [cue('a short bicycle or scooter pass threading between shoppers', 'a bicycle or scooter pass', '人群间穿过的一辆单车或踏板车')],
      dusk: [cue('a quick door chime before the crowd fold back into the street', 'a quick door chime', '人群里闪过的一声门铃')],
      night: [cue('tableware being gathered from the last outdoor table', 'tableware from the last outdoor table', '最后一桌收餐具的声音')],
    },
  },
  residential_block: {
    bed: allTimes([
      cue('quiet block air with leaves, distant ventilation, and room between sounds', 'quiet block air and leaves', '安静街区里的树叶与远处空调声'),
    ]),
    activity: {
      dawn: [cue('a broom working across the pavement before the street fully wakes', 'morning sweeping', '清晨扫地声')],
      day: [cue('gates, doors, and a few scooters moving through the block', 'gates, doors, and scooters', '院门家门与零散踏板车声')],
      dusk: [cue('returning bicycles and low courtyard talk settling into the block', 'returning bicycles and courtyard talk', '回家的单车与院子里的低声交谈')],
      night: [cue('one distant dog bark and a rare car passing the corner', 'a distant dog bark and rare car pass', '远处犬吠与偶尔驶过的车声')],
    },
    accent: {
      dawn: [cue('a metal gate latch clicking shut after someone leaves early', 'a gate latch click', '一声清脆的铁门闩')],
      day: [cue('a child’s ball or scooter briefly touching the pavement then fading away', 'a brief ball or scooter on pavement', '地面上掠过的一下球声或滑板车声')],
      dusk: [cue('tableware touching softly through an open kitchen window', 'soft tableware through a window', '厨房窗边轻轻碰响的餐具声')],
      night: [cue('an elevator arrival chime or hallway door heard from inside the block', 'a distant elevator or hallway chime', '楼里传来的电梯或门铃提示声')],
    },
  },
  park: {
    bed: {
      dawn: [cue('leaves moving in light morning air with birds taking the foreground', 'leaves and morning birds', '树叶轻响与晨鸟声')],
      day: [cue('leaves, shade, and open park air holding the scene together', 'leaves in open park air', '树叶与开阔园中空气感')],
      dusk: [cue('canopy movement and the first insects taking over the greenery', 'canopy movement and first insects', '树梢轻动与开始冒头的虫鸣')],
      night: [cue('dark leaves and insects carrying the park after foot traffic thins', 'night leaves and insects', '夜里的树叶与虫鸣')],
    },
    activity: {
      dawn: [cue('measured footsteps from early walkers and exercise groups on the path', 'early walkers on the path', '步道上晨练和散步的脚步声')],
      day: [cue('bicycle tires and children passing at a believable distance', 'bicycles and children at a distance', '远处的单车与孩童声')],
      dusk: [cue('joggers and dogs crossing the path as the light drops', 'joggers and dogs on the path', '暮色里掠过步道的跑步与遛狗声')],
      night: [cue('isolated footsteps along the path with long spaces between them', 'isolated path footsteps', '间隔很长的零星步道脚步')],
    },
    accent: {
      dawn: [cue('a fountain or sprinkler catching the morning before the crowd builds', 'a fountain or sprinkler', '清晨喷泉或喷灌声')],
      day: [cue('a bench scrape or stroller wheel briefly meeting the path surface', 'a bench scrape or stroller wheel', '长椅轻挪或婴儿车轮滑过')],
      dusk: [cue('grass insects gathering at the edge of the path', 'grass insects at the path edge', '步道边草丛里的虫鸣')],
      night: [cue('a distant court echo or metal fence touch at the park edge', 'a distant court or fence touch', '公园边缘传来的球场回声或栏杆轻响')],
    },
  },
  campus: {
    bed: allTimes([
      cue('open campus air with footsteps and bicycles naturally spread across the grounds', 'campus air with footsteps and bicycles', '校园里分散的脚步与单车声'),
    ]),
    activity: {
      dawn: [cue('maintenance carts and early footsteps before classes gather', 'maintenance carts and early footsteps', '清晨保洁小车与零散脚步')],
      day: [cue('students crossing between buildings with bicycle chains and backpacks shifting', 'students crossing between buildings', '楼间穿行的学生与单车链条声')],
      dusk: [cue('a sports court thump or practice whistle drifting from deeper in campus', 'a distant sports court thump', '校园深处飘来的球场拍击声')],
      night: [cue('dorm-return footsteps and bicycles gliding quietly past lit buildings', 'dorm-return footsteps and bicycles', '宿舍区前回寝的脚步与单车声')],
    },
    accent: {
      dawn: [cue('one door closer and a key ring at the edge of a teaching building', 'a teaching-building door closer', '教学楼门缓缓回弹的一声')],
      day: [cue('a short campus bell or class-change tone heard from across the quad', 'a class-change tone', '远处的一声上下课提示')],
      dusk: [cue('a staircase handrail or gym bag brushing past in one quick moment', 'a stair rail or gym bag brush', '楼梯扶手或运动包擦过的一下轻响')],
      night: [cue('a vending machine hum and one door latch near the dorm block', 'a vending machine hum and door latch', '宿舍边自动售货机低鸣与门闩声')],
    },
  },
  transit_hub: {
    bed: allTimes([
      cue('constant station air with footsteps, rolling cases, and machine hum under everything', 'station footsteps and rolling cases', '站内脚步、行李轮与机器低鸣'),
    ]),
    activity: {
      dawn: [cue('first departures with buses or trains beginning to take people out of the city', 'first departures', '最早一班发车的动静')],
      day: [cue('platform movement building and releasing in short waves', 'waves of platform movement', '站台与通道里一阵阵起落的人流')],
      dusk: [cue('arrivals stacking up as tired footsteps and luggage return through the hall', 'arrival-hour luggage and footsteps', '晚高峰回流的行李轮与脚步')],
      night: [cue('sparser late departures echoing through the larger station space', 'sparser late departures', '夜里稀疏的末班出发声')],
    },
    accent: {
      dawn: [cue('one soft departure chime or platform tone from deeper inside the station', 'a departure chime', '深处传来的一声发车提示音')],
      day: [cue('bus air brakes or a train door warning caught briefly at the edge', 'air brakes or a train door warning', '车门提示或气刹轻响')],
      dusk: [cue('a blurred station announcement passing overhead as texture', 'a blurred station announcement', '头顶掠过的一段模糊站内广播')],
      night: [cue('a suitcase wheel rattling across one seam in the floor', 'a suitcase wheel over a floor seam', '行李轮压过地面接缝的一阵轻响')],
    },
  },
  coastal_waterfront: {
    bed: allTimes([
      cue('sea wash and wind moving along the waterfront railings', 'sea wash and wind along the railings', '海浪与风掠过海边栏杆'),
    ]),
    activity: {
      dawn: [cue('gulls and early promenade footsteps before the shore gets busy', 'gulls and early promenade footsteps', '海鸟与清晨步道脚步')],
      day: [cue('promenade footsteps, bicycles, and bright seafront movement', 'promenade footsteps and bicycles', '海边步道上的脚步与单车')],
      dusk: [cue('evening walkers and the harbor edge beginning to carry farther over the water', 'evening walkers over the water', '傍晚沿海步道上的人声与脚步')],
      night: [cue('longer tide movement and emptier footsteps on the seafront path', 'night tide and emptier seafront footsteps', '夜潮与更稀疏的海边步道脚步')],
    },
    accent: {
      dawn: [cue('a buoy bell or mast touch from somewhere farther down the shore', 'a buoy bell or mast touch', '远处浮标铃或桅杆轻碰')],
      day: [cue('a bicycle bell or railing touch passing close to the seawall', 'a bicycle bell near the seawall', '海堤边掠过的一声单车铃')],
      dusk: [cue('one distant ship horn under the wind and water', 'a distant ship horn', '风浪下隐约的一声船笛')],
      night: [cue('rope strain or loose rigging tapping once in the dark', 'one rope strain or rigging tap', '夜里一声缆绳受力或索具轻敲')],
    },
  },
  riverfront: {
    bed: allTimes([
      cue('continuous river movement softening the edge of the built environment', 'continuous river movement', '持续的河水流动声'),
    ]),
    activity: {
      dawn: [cue('birds and sweepers along the embankment before the path fills', 'embankment birds and sweepers', '沿河步道上的鸟鸣与清扫声')],
      day: [cue('riverside footsteps and bicycles moving along the embankment', 'riverside footsteps and bicycles', '沿河步道的脚步与单车')],
      dusk: [cue('people lingering by the railing while the river keeps carrying the scene', 'people lingering by the railing', '栏杆边逗留的人声与脚步')],
      night: [cue('wind along the embankment with isolated late footsteps by the water', 'night wind and late riverside footsteps', '夜里江风与零散晚归脚步')],
    },
    accent: {
      dawn: [cue('a bridge seam or metal railing answered briefly by the water below', 'a bridge seam or railing touch', '桥缝或栏杆轻响与水面回声')],
      day: [cue('one small boat wake or ferry engine passing downstream', 'a boat wake or ferry engine', '一阵小船尾波或渡船马达声')],
      dusk: [cue('a low boat horn or hull knock farther along the river', 'a low boat horn or hull knock', '江面深处的一声低低船笛或船身敲响')],
      night: [cue('steps descending toward the water and then fading out again', 'steps descending toward the water', '通向水边的脚步声渐渐远去')],
    },
  },
  harbor: {
    bed: allTimes([
      cue('harbor water slapping the edge while ropes and hulls keep shifting', 'harbor water, ropes, and hulls', '港池水拍岸与缆绳船身轻动'),
    ]),
    activity: {
      dawn: [cue('workday setup around the dock before the port fully comes alive', 'dockside setup at dawn', '清晨码头开始忙起来的准备声')],
      day: [cue('dockside footsteps, diesel idling, and practical handling around the pier', 'dockside footsteps and diesel idle', '码头脚步与柴油机怠速声')],
      dusk: [cue('ferry and workboat movement carrying farther in the cooling air', 'ferry and workboat movement', '傍晚更清晰的渡船与工作船动静')],
      night: [cue('looser hardware, darker water, and fewer but heavier movements at the quay', 'night hardware and heavier harbor movement', '夜里更沉的港区硬件与水声')],
    },
    accent: {
      dawn: [cue('a chain settling or a cleat taking tension on the dock', 'a chain settling on the dock', '码头上一截链条落定的声音')],
      day: [cue('one forklift reverse beep or cart wheel over worn dock concrete', 'a reverse beep or dock cart wheel', '倒车提示音或推车压过旧码头地面')],
      dusk: [cue('a ship horn or rope strain cutting once through the harbor', 'a ship horn or rope strain', '穿过港区的一声船笛或缆绳受力')],
      night: [cue('mast lines tapping briefly somewhere above the dark water', 'mast lines tapping in the dark', '黑水面上方传来一阵桅索轻敲')],
    },
  },
  historic_quarter: {
    bed: allTimes([
      cue('narrow-street footsteps and small echoes off stone or brick facades', 'footsteps echoing through old streets', '老街石墙间回荡的脚步声'),
    ]),
    activity: {
      dawn: [cue('shopfronts opening slowly into an older street before crowds arrive', 'old-street shopfronts opening', '老街店门慢慢打开的声音')],
      day: [cue('tourist or market footsteps woven with daily life at a realistic distance', 'market and visitor footsteps', '老街里游客与日常脚步混在一起')],
      dusk: [cue('chairs, shutters, and small alley talk as the quarter warms into evening', 'chairs, shutters, and alley talk', '傍晚巷子里的椅脚、卷闸门与低声交谈')],
      night: [cue('emptier stone lanes with only occasional footsteps and doors', 'emptier stone lanes at night', '夜里更空的石板巷道与偶尔开关门')],
    },
    accent: {
      dawn: [cue('a wooden door bar or latch shifting against an older frame', 'a wooden door latch', '老木门门闩轻响')],
      day: [cue('a bell, chime, or handcart touching the paving once', 'a bell or handcart on old paving', '石板路上一声铃响或手推车轻颠')],
      dusk: [cue('tableware and a doorway curtain moving in one old alley', 'tableware and a doorway curtain', '一条老巷里餐具与门帘轻动')],
      night: [cue('a single bell or metal ring carrying farther through the lane', 'one bell carrying through the lane', '巷子深处传来的一声钟铃')],
    },
  },
  industrial_edge: {
    bed: allTimes([
      cue('ventilation hum, broad machinery presence, and hard-surfaced open space', 'ventilation hum and machinery presence', '通风设备低鸣与机器存在感'),
    ]),
    activity: {
      dawn: [cue('shift-start vehicle movement and metal shutters beginning the day', 'shift-start vehicles and shutters', '换班时的车辆与卷闸门声')],
      day: [cue('forklifts, loading bays, and truck handling moving across the yard', 'forklifts and loading-bay handling', '叉车与装卸口作业声')],
      dusk: [cue('yard traffic thinning while the heavier machinery lingers', 'yard traffic thinning at dusk', '傍晚渐稀的场内车辆和残留机器声')],
      night: [cue('fewer workers but a clearer HVAC and utility-bed over the site', 'night HVAC and utility-bed', '夜里更清晰的空调机组与设施底噪')],
    },
    accent: {
      dawn: [cue('a reversing beep and roller door in the same lane', 'a reversing beep and roller door', '同一条通道里的倒车提示与卷门声')],
      day: [cue('pallets or metal frames being set down once on concrete', 'pallets on concrete', '托盘或金属架落到水泥地上的声音')],
      dusk: [cue('truck air brakes sighing at the edge of the yard', 'truck air brakes', '场边一辆货车的气刹声')],
      night: [cue('a chain-link fence touch or utility gate latch after dark', 'a fence touch or utility gate latch', '夜里一声铁丝网或工具门门闩')],
    },
  },
  rural_fields: {
    bed: allTimes([
      cue('wind moving across crops, grass, or open ground with room around it', 'wind over fields', '风吹过田野'),
    ]),
    activity: {
      dawn: [cue('birds and the first farm tasks beginning far across the land', 'birds and first farm tasks', '晨鸟与远处最早开始的农活')],
      day: [cue('field insects and occasional machinery or livestock carried on the air', 'field insects and distant machinery', '田间虫鸣与远处农机声')],
      dusk: [cue('insects rising as the open land cools and work drops away', 'insects rising over cooling fields', '田野降温后逐渐上来的虫鸣')],
      night: [cue('night insects and long open pauses between very distant farm sounds', 'night insects and long open pauses', '夜里的虫鸣与漫长空隙')],
    },
    accent: {
      dawn: [cue('a rooster, gate, or bucket from one nearby yard', 'a rooster, gate, or bucket', '近处院子里的一声鸡叫、门响或水桶声')],
      day: [cue('one tractor pass or livestock tag carried lightly across the field', 'one tractor pass or livestock tag', '远远飘来的拖拉机声或牲畜铃牌声')],
      dusk: [cue('a dog bark or tools being brought back in before dark', 'a dog bark or tools being brought in', '天黑前收工具时的犬吠或金属碰响')],
      night: [cue('water in an irrigation ditch or a single late motorbike on the far road', 'irrigation water or a late motorbike', '沟渠流水或远路上一辆晚归摩托')],
    },
  },
  forest_path: {
    bed: allTimes([
      cue('tree canopy movement and ground texture holding most of the scene', 'tree canopy and ground texture', '树梢与地面质感声'),
    ]),
    activity: {
      dawn: [cue('birds taking turns across the canopy as the trail wakes slowly', 'dawn birds across the canopy', '清晨林冠间轮番响起的鸟鸣')],
      day: [cue('insects, leaves, and occasional footsteps or branch movement on the trail', 'leaves, insects, and trail movement', '树叶、虫声与林道上的零星动静')],
      dusk: [cue('the forest dimming into insects and fewer daytime birds', 'dusk insects replacing daytime birds', '暮色里虫鸣接过白天的鸟声')],
      night: [cue('dark forest insects with long spaces and the occasional branch shift', 'night insects and branch shifts', '夜里的虫鸣与偶尔树枝轻动')],
    },
    accent: {
      dawn: [cue('a streamlet or damp ground answering somewhere beside the path', 'a small stream beside the path', '步道旁一小段溪水声')],
      day: [cue('one twig snap or dry leaf run under passing movement', 'one twig snap or leaf run', '一声树枝折响或落叶被带动')],
      dusk: [cue('a far wood knock or bird wing through lower branches', 'a far wood knock or wingbeat', '远处树干轻敲或枝间振翅声')],
      night: [cue('one hidden animal rustle staying brief and believable', 'one brief hidden rustle', '短促而可信的一阵草木窸窣')],
    },
  },
  mountain_path: {
    bed: allTimes([
      cue('ridge wind and the broader air of exposed elevation', 'ridge wind', '山脊上的风声'),
    ]),
    activity: {
      dawn: [cue('first birds and cautious footsteps on loose ground', 'first birds and loose-ground footsteps', '最早的鸟鸣与碎石地脚步')],
      day: [cue('boots on stone and air moving openly across the slope', 'boots on stone and open slope wind', '石路上的脚步与开阔坡面的风')],
      dusk: [cue('the path emptying while the wind keeps the ridge occupied', 'an emptying path and ridge wind', '渐空的山路与仍在呼呼吹的风')],
      night: [cue('colder wind and occasional stones shifting under isolated movement', 'colder wind and shifting stones', '更冷的风与零星滚动的碎石')],
    },
    accent: {
      dawn: [cue('a stream crossing or trekking pole tap in one narrow section', 'a stream crossing or pole tap', '一段山溪或登山杖轻点石面')],
      day: [cue('one raven or high bird call cutting across the slope', 'one high bird call', '山坡上空掠过的一声高处鸟鸣')],
      dusk: [cue('a loose stone running briefly downhill off the path', 'a loose stone running downhill', '一粒碎石顺坡滚下去')],
      night: [cue('a cable, sign, or handrail moving once in the wind', 'a sign or handrail in the wind', '风里轻轻一响的指示牌或栏杆')],
    },
  },
  open_water: {
    bed: allTimes([
      cue('broad swell and water movement with very little solid land nearby', 'broad swell and open water', '开阔海面上的涌浪声'),
    ]),
    activity: {
      dawn: [cue('rigging and low engine traces before the day fully lifts', 'rigging and low engine traces', '晨光前的索具声与低低引擎痕迹')],
      day: [cue('ropes, hull creaks, and marine movement carried in open air', 'ropes, hull creaks, and marine movement', '缆绳、船体与海上活动声')],
      dusk: [cue('longer swell and distant working boats under cooling air', 'longer swell and distant working boats', '更绵长的涌浪与远处工作船')],
      night: [cue('dark open water taking over while the occasional engine remains far away', 'dark water and a far engine', '夜海与远远的引擎声')],
    },
    accent: {
      dawn: [cue('a buoy bell or line strain carrying once over the swell', 'a buoy bell or line strain', '涌浪上飘来一声浮标铃或拉索受力声')],
      day: [cue('one gull or deck knock used sparingly against the water bed', 'one gull or deck knock', '海面底噪里偶尔一声海鸟或甲板轻敲')],
      dusk: [cue('a low ship horn stretched thin by distance', 'a low distant ship horn', '被距离拉得很薄的一声低低船笛')],
      night: [cue('rigging tapping once in the dark before the swell takes over again', 'one rigging tap in the dark', '黑暗里一声索具轻敲后又归于海浪')],
    },
  },
  polar_outpost: {
    bed: allTimes([
      cue('wide polar wind and long open quiet around ice or snow', 'wide polar wind', '开阔极地风声'),
    ]),
    activity: {
      dawn: [cue('fine snow underfoot and slow utility movement in the cold', 'snow underfoot and slow utility movement', '脚下压雪与缓慢的设备动静')],
      day: [cue('wind, snow compression, and sparse practical movement', 'wind, snow compression, and sparse movement', '风声、压雪声与极少的活动动静')],
      dusk: [cue('cold air hardening around the last movements of the day', 'cold air around the day’s last movement', '空气变硬时最后一点活动声')],
      night: [cue('mostly wind and long empty intervals over frozen ground', 'mostly wind and long empty intervals', '大多只剩风和漫长空隙')],
    },
    accent: {
      dawn: [cue('a metal latch or rope stiffened by the cold', 'a metal latch or rope in the cold', '寒冷里发紧的一声门闩或绳索声')],
      day: [cue('one ice crack or snow shovel touch staying brief and dry', 'one ice crack or shovel touch', '一声干脆的冰裂或铁锹碰雪声')],
      dusk: [cue('a distant generator or utility hut hum if the site is inhabited', 'a distant generator hum', '有人驻留时远处发电机低鸣')],
      night: [cue('one sharper ice tick before the wind reclaims the scene', 'one sharper ice tick', '风声重新吞没前一声更尖的冰响')],
    },
  },
};

const SCENE_TAG_CUES: Partial<Record<string, SoundCue[]>> = {
  market: [
    cue('crates, folding tables, or stall utensils being handled close to opening time', 'crates or stall utensils', '货箱、折叠桌或摊位器具声'),
  ],
  transit: [
    cue('a blurred overhead announcement used only as station texture', 'a blurred overhead announcement', '模糊的头顶广播声'),
  ],
  coast: [
    cue('wind touching railings and loose hardware along the water edge', 'wind against railings and hardware', '风擦过栏杆和五金件'),
  ],
  river: [
    cue('a railing or bridge seam answering the water below', 'a railing or bridge seam above water', '栏杆或桥缝回应着下面的水声'),
  ],
  harbor: [
    cue('rope tension and mast hardware ticking against the harbor air', 'rope tension and mast hardware', '缆绳受力与桅杆五金轻响'),
  ],
  residential: [
    cue('a courtyard gate, mailbox flap, or hallway door fitting the block', 'a courtyard gate or hallway door', '院门、信箱盖或楼道门的声音'),
  ],
  park: [
    cue('a fountain, sprinkler, or bench scrape kept small within the greenery', 'a fountain, sprinkler, or bench scrape', '喷泉、喷灌或长椅轻挪'),
  ],
  campus: [
    cue('a bicycle stand clink or classroom bell carried briefly across campus', 'a bicycle stand clink or classroom bell', '车架轻碰或一声课铃'),
  ],
  industrial: [
    cue('a reverse beep, pallet drop, or roller door belonging to the site', 'a reverse beep, pallet drop, or roller door', '倒车提示、托盘落地或卷门声'),
  ],
  historic: [
    cue('a bell, wooden latch, or handcart wheel belonging to the old quarter', 'a bell, wooden latch, or handcart wheel', '钟铃、木门闩或手推车轮声'),
  ],
  forest: [
    cue('one twig snap or soft undergrowth rustle close to the trail', 'one twig snap or undergrowth rustle', '近处一声树枝折响或草木窸窣'),
  ],
  mountain: [
    cue('a loose stone, sign chain, or trekking pole touching the path once', 'a loose stone or trekking pole tap', '碎石滚动或登山杖一点石面'),
  ],
  fields: [
    cue('one farm tool, gate, or livestock tag carried lightly over the land', 'one farm tool, gate, or livestock tag', '一声农具、门响或牲畜铃牌'),
  ],
};

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getContextSeed(context: LocationContext, salt: string): number {
  return hashString(
    [
      salt,
      context.sceneType ?? '',
      context.timeSlot,
      context.countryName,
      context.administrativeRegionName ?? '',
      context.cityName,
      context.regionName ?? '',
      context.coordinates[0].toFixed(3),
      context.coordinates[1].toFixed(3),
    ].join('|')
  );
}

function dedupeCues(cues: Array<SoundCue | null | undefined>): SoundCue[] {
  const seen = new Set<string>();
  const result: SoundCue[] = [];

  for (const cueEntry of cues) {
    if (!cueEntry || seen.has(cueEntry.prompt)) {
      continue;
    }

    seen.add(cueEntry.prompt);
    result.push(cueEntry);
  }

  return result;
}

function selectCueBySeed(cues: SoundCue[], seed: number): SoundCue | null {
  if (cues.length === 0) {
    return null;
  }

  return cues[seed % cues.length] ?? null;
}

function resolvePool(
  pool: TimeAwareCuePool,
  timeSlot: TimeSlot
): SoundCue[] {
  if (Array.isArray(pool)) {
    return pool;
  }

  return pool[timeSlot] ?? pool.day ?? pool.dawn ?? pool.dusk ?? pool.night ?? [];
}

export function getEffectiveSceneType(context: LocationContext): SceneType {
  if (context.sceneType) {
    return context.sceneType;
  }

  if (context.regionType === 'ocean') {
    return 'open_water';
  }

  if (context.regionType === 'polar') {
    return 'polar_outpost';
  }

  if (context.nearWater === 'sea' || context.terrain === 'coast') {
    return 'coastal_waterfront';
  }

  if (context.nearWater === 'river' || context.nearWater === 'canal' || context.terrain === 'river') {
    return 'riverfront';
  }

  if (context.terrain === 'lake') {
    return 'riverfront';
  }

  if (context.terrain === 'forest' || context.terrain === 'jungle') {
    return 'forest_path';
  }

  if (context.terrain === 'mountain') {
    return 'mountain_path';
  }

  if (context.regionType === 'city_center') {
    return 'urban_main_road';
  }

  if (context.regionType === 'city_suburb') {
    return 'residential_block';
  }

  if (context.regionType === 'town') {
    return 'commercial_district';
  }

  return 'rural_fields';
}

export function getSceneSettingLabel(
  context: LocationContext,
  locale: AppLocale
): string {
  return SCENE_LABELS[getEffectiveSceneType(context)][locale];
}

function getSceneTagCuePool(context: LocationContext): SoundCue[] {
  return (context.sceneTags ?? [])
    .flatMap((tag) => SCENE_TAG_CUES[tag] ?? [])
    .filter((cueEntry, index, cues) => cues.indexOf(cueEntry) === index);
}

export function getSceneLocalityCues(context: LocationContext): SoundCue[] {
  const sceneType = getEffectiveSceneType(context);
  const palette = SCENE_CUE_PALETTES[sceneType];
  const bedCue = selectCueBySeed(resolvePool(palette.bed, context.timeSlot), getContextSeed(context, 'scene-bed'));
  const activityCue = selectCueBySeed(resolvePool(palette.activity, context.timeSlot), getContextSeed(context, 'scene-activity'));
  const sceneTagCuePool = getSceneTagCuePool(context);
  const accentPool =
    sceneTagCuePool.length > 0
      ? dedupeCues(sceneTagCuePool)
      : dedupeCues(resolvePool(palette.accent, context.timeSlot));
  const accentCue = selectCueBySeed(accentPool, getContextSeed(context, 'scene-accent'));

  return dedupeCues([bedCue, activityCue, accentCue]).slice(0, 3);
}

export function getSceneLocalitySignatureCue(context: LocationContext): SoundCue {
  const localityCues = getSceneLocalityCues(context);
  return localityCues[1] ?? localityCues[0] ?? cue('one locally grounded environmental detail', 'one local detail', '一个本地环境细节');
}
