'use client';

// 关于信息区域组件
// 显示应用名称、版本号和归属信息
// Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
import React from 'react';
import './AboutSection.css';

/** 关于信息区域：应用名称、版本和归属 */
export function AboutSection(): React.JSX.Element {
  return (
    <section className="about-section" aria-labelledby="about-section-header">
      <p id="about-section-header" className="about-section__app-name">
        PinDrop
      </p>
      <p className="about-section__version">Version 0.1.0</p>
      <p className="about-section__attribution">
        ElevenLabs · Leaflet · Next.js
      </p>
    </section>
  );
}
