import { motion } from 'motion/react';
import { ArrowLeft, Zap, Heart, Timer as TimerIcon, HelpCircle, ShieldAlert, Snowflake } from 'lucide-react';
import { useState } from 'react';

type InfoLang = 'en' | 'zh';

export default function InstructionScreen({ onBack }: { onBack: () => void }) {
  const [lang, setLang] = useState<InfoLang>('en');

  const content = {
    en: {
      title: "HOW TO PLAY",
      rules: [
        "Select the correct pinyin or hanzi matching the audio before the balloon disappears.",
        "Correct choice: +10 points.",
        "Wrong choice or Miss: -5 points and lose 1 life.",
        "Game ends when time (60s) runs out or lives reach 0."
      ],
      props: [
        { name: "HintCard", desc: "Reveals the Chinese character. Start with 3.", icon: <HelpCircle /> },
        { name: "Scope", desc: "Removes 2 wrong pinyin balloons. Earn by 3 correct in a row.", icon: <ShieldAlert /> },
        { name: "Ice Gun", desc: "Pauses time for 5s. Earn by completing sentence tests.", icon: <Snowflake /> }
      ]
    },
    zh: {
      title: "游戏玩法",
      rules: [
        "在气球消失前，选择与音频匹配的正确拼音或汉字。",
        "正确选择：+10 分。",
        "错误选择或漏掉：-5 分并失去 1 点生命值。",
        "当时间（60秒）耗尽或生命值为 0 时，游戏结束。"
      ],
      props: [
        { name: "提示卡 (Hint Card)", desc: "显示汉字。初始拥有 3 张。", icon: <HelpCircle /> },
        { name: "减倍镜 (Scope)", desc: "移除 2 个错误拼音气球。连续答对 3 题获得。", icon: <ShieldAlert /> },
        { name: "冰冻枪 (Ice Gun)", desc: "暂停时间 5 秒。完成句子练习获得。", icon: <Snowflake /> }
      ]
    }
  };

  const current = content[lang];

  return (
    <div className="flex flex-col min-h-screen bg-sky-200 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center">
          <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm text-sky-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-3xl font-black text-sky-800 ml-4 tracking-tight">{current.title}</h2>
        </div>
        
        <div className="flex bg-white/50 p-1 rounded-xl">
          <button 
            onClick={() => setLang('en')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${lang === 'en' ? 'bg-sky-600 text-white shadow-md' : 'text-sky-600'}`}
          >
            EN
          </button>
          <button 
            onClick={() => setLang('zh')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${lang === 'zh' ? 'bg-sky-600 text-white shadow-md' : 'text-sky-600'}`}
          >
            ZH
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full space-y-6 pb-12">
        <section className="bg-white p-8 rounded-[40px] shadow-sm">
          <h3 className="text-2xl font-black text-sky-700 mb-6 flex items-center gap-3">
            <Zap className="w-8 h-8 text-orange-500 fill-orange-500" />
            {lang === 'en' ? 'BASIC RULES' : '基本规则'}
          </h3>
          <ul className="space-y-4">
            {current.rules.map((rule, i) => (
              <li key={i} className="flex gap-4 items-start text-lg font-medium text-slate-700">
                <div className="w-8 h-8 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </div>
                {rule}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white p-8 rounded-[40px] shadow-sm">
          <h3 className="text-2xl font-black text-sky-700 mb-6 flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-500 fill-yellow-500" />
            {lang === 'en' ? 'GAME PROPS' : '游戏道具'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {current.props.map((prop, i) => (
              <div key={i} className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-sky-500 mb-4 scale-110">
                  {prop.icon}
                </div>
                <h4 className="text-xl font-black text-slate-800 mb-2 uppercase">{prop.name}</h4>
                <p className="text-slate-600 font-medium leading-tight">{prop.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
