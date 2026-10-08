import { css } from 'lit';

export const popupStyles = css`
    :host { display: flex; flex-direction: column; box-sizing: border-box; width: 384px; height: 600px; overflow: hidden; background: #f3f6fb; color: #17243a; font: 14px system-ui, sans-serif; }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    .scroll-area { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 20px 0; }
    header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-mark { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 11px; background: linear-gradient(140deg, #4f7cff, #7254e8); color: white; font-size: 19px; font-weight: 800; }
    h1 { margin: 0; font-size: 22px; letter-spacing: -.055em; }
    h2 { margin: 0; font-size: 14px; letter-spacing: -.015em; }
    .version { color: #8490a6; font-size: 11px; font-weight: 700; }
    .card { margin-bottom: 14px; padding: 16px; border: 1px solid #e4eaf3; border-radius: 17px; background: white; }
    .status { position: relative; overflow: hidden; padding: 19px; border: 0; background: linear-gradient(135deg, #162947, #203c6c); color: white; }
    .status::after { content: ''; position: absolute; width: 150px; height: 150px; right: -38px; top: -75px; border: 1px solid #ffffff26; border-radius: 50%; pointer-events: none; }
    .status small { position: relative; color: #b9ccec; font-size: 12px; }
    .tracking { position: relative; margin: 14px 0 0; padding-top: 12px; border-top: 1px solid #ffffff29; color: #d6e5ff; font-size: 12px; line-height: 1.4; }
    .time { position: relative; display: block; margin: 6px 0 3px; font-size: 34px; font-weight: 800; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
    .section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
    .hint { color: #8290a5; font-size: 11px; }
    .mode-switch { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
    .mode-button { display: flex; min-width: 0; min-height: 74px; flex-direction: column; align-items: flex-start; justify-content: center; gap: 4px; padding: 10px; border: 1px solid #e4eaf3; border-radius: 12px; background: #f8fafd; color: #6d7b91; text-align: left; cursor: pointer; }
    .mode-button strong { font-size: 14px; color: #293a55; }
    .mode-button small { font-size: 11px; }
    .mode-button[data-active='true'] { border-color: #6685f5; background: #eef2ff; color: #4c63a5; }
    .mode-button[data-active='true'] strong { color: #284aba; }
    .mode-button:hover { border-color: #9bb0f6; }
    .mode-button:focus-visible, .switch input:focus-visible + .track, .save-button:focus-visible { outline: 3px solid #a9bcff; outline-offset: 2px; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
    .row label { font-weight: 600; }
    input[type='number'] { width: 76px; padding: 8px 9px; border: 1px solid #d6dfec; border-radius: 9px; background: #f9fbfe; color: #17243a; font: inherit; font-weight: 700; text-align: right; }
    input[type='number']:focus { border-color: #6584ec; outline: 3px solid #6584ec29; }
    .number-wrap { display: flex; align-items: center; gap: 6px; color: #8793a6; font-size: 12px; }
    .platform-list { display: grid; gap: 9px; }
    .platform-card { padding: 12px; border: 1px solid #e4eaf3; border-radius: 13px; background: #fbfcff; }
    .platform-main { display: flex; align-items: center; gap: 10px; }
    .platform-badge { display: grid; width: 35px; height: 35px; flex: none; place-items: center; }
    .platform-badge img { display: block; width: 35px; height: 35px; object-fit: contain; }
    .platform-info { min-width: 0; flex: 1; }
    .platform-info strong { display: block; font-size: 12px; }
    .platform-info small { display: block; margin-top: 3px; color: #8b98ab; font-size: 11px; font-variant-numeric: tabular-nums; }
    .switch { position: relative; display: inline-flex; width: 42px; height: 24px; flex: none; cursor: pointer; }
    .switch input { position: absolute; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
    .track { width: 100%; border-radius: 99px; background: #cbd4e3; transition: background .18s ease; }
    .track::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: transform .18s ease; }
    .switch input:checked + .track { background: #5677e8; }
    .switch input:checked + .track::after { transform: translateX(18px); }
    .platform-limit { display: flex; align-items: center; justify-content: space-between; margin-top: 11px; padding-top: 10px; border-top: 1px solid #e9eef6; color: #7c8ba1; font-size: 11px; }
    .platform-limit input { width: 68px; padding: 5px 7px; font-size: 12px; }
    .save-bar { flex: none; padding: 12px 20px 20px; border-top: 1px solid #e4eaf3; background: #f3f6fb; }
    .save-button { width: 100%; padding: 12px; border: 0; border-radius: 11px; background: #4368dd; color: white; font: inherit; font-weight: 750; cursor: pointer; }
    .save-button:hover { background: #3457cb; }
    .feedback { margin: 10px 0 0; font-size: 12px; }
    .error { color: #b91c1c; }
    .success { color: #166534; }
  `;
