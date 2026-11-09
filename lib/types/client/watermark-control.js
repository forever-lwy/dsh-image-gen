import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from 'react';
const REASONS = {
    'channel-unconfirmed': { zh: '此渠道尚未确认水印支持，可按接口文档配置对应操作的水印字段。', en: 'Watermark support is unconfirmed. Configure the matching operation using the channel documentation.' },
    'model-unconfirmed': { zh: '当前模型尚未确认水印支持。', en: 'Watermark support is unconfirmed for this model.' },
    'account-unconfirmed': { zh: '此接口的水印参数和账号开通条件尚未确认。', en: 'The watermark parameter and account requirements are unconfirmed for this API.' },
    'edit-format': { zh: '当前图生图请求格式不支持已配置的水印字段。', en: 'The configured watermark field is unavailable in this editing format.' },
    'no-api-control': { zh: '此接口没有已确认的可见水印开关。', en: 'No visible-watermark control has been confirmed for this API.' },
};
/** Keep the control discoverable while clearly distinguishing confirmed and unknown contracts. */
export const WatermarkControl = ({ capability, value, onChange, lang }) => {
    const noteId = useId();
    const supported = capability.status === 'supported';
    const reason = REASONS[capability.reason ?? 'channel-unconfirmed'][lang];
    return _jsxs("label", { className: "dsh-ig-field-select", children: [_jsx("span", { id: `${noteId}-label`, children: lang === 'en' ? 'Visible watermark' : '可见水印' }), _jsx("select", { value: supported ? value : 'default', disabled: !supported, "aria-labelledby": `${noteId}-label`, "aria-describedby": supported ? undefined : noteId, title: supported ? (lang === 'en' ? 'Controls the visible watermark added during generation.' : '控制生成图片时添加的可见水印。') : reason, onChange: event => onChange(event.target.value), children: supported ? _jsxs(_Fragment, { children: [_jsx("option", { value: "default", children: lang === 'en' ? 'Channel default' : '渠道默认' }), _jsx("option", { value: "off", children: lang === 'en' ? 'Off' : '关闭' }), _jsx("option", { value: "on", children: lang === 'en' ? 'On' : '开启' })] }) : _jsx("option", { value: "default", children: capability.status === 'unknown'
                        ? (lang === 'en' ? 'Support unconfirmed' : '支持未确认')
                        : (lang === 'en' ? 'No confirmed control' : '无已确认开关') }) }), !supported ? _jsx("small", { id: noteId, className: "dsh-ig-inline-note", children: reason }) : null] });
};
//# sourceMappingURL=watermark-control.js.map