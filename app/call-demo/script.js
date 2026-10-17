// The scripted call. Everything the demo shows and plays comes from this file.
// Edit text here, then run `node build-audio.mjs` to regenerate the voices.
//
// lines   play in order. `gap` is the pause (s) before the line starts.
//         `say` overrides what the voice speaks when it differs from the transcript text.
//         `marks` are phrases Ellie highlights; each one lights up when the check that flags its tactic runs.
// checks  are Ellie's scam checks (Claude). Each fires `delay` s after the line `after` ends.
//         The first check at or above `threshold` triggers the intervention.

window.ELLIE_SCRIPT = {
  elder:  { name: 'Rose Miller', first: 'Rose', number: '+49 30 •••• 2118' },
  family: { name: 'Anna', relation: 'daughter' },
  caller: { number: '+49 30 5555 0142', place: 'Berlin' },
  threshold: 80,

  // `eleven` = ElevenLabs voice id (wins when set), `fish` = Fish Audio voice id, `say` = macOS voice when there are no keys.
  // A line's `tags` (e.g. '[concerned]') are sent to ElevenLabs v3 only.
  voices: {
    caller: { eleven: 'nzeAacJi50IvxcyDnMXa', fish: '7aadcfdfa09f44a3a4209fbd234364d3', speed: 1.0,  say: 'Daniel', rate: 185 },                 // ElevenLabs German police officer (Jonno's pick)
    rose:   { eleven: 'Byvn0bYVP2rGWJsdCbCU', fish: '8db547ea044f44838bf2f8a039f05b5a', speed: 1.0, say: 'Grandma (English (UK))', rate: 165 }, // ElevenLabs (Jonno's pick)
    ellie:  { eleven: 'XZXyuzPdidXaSa10PmVA', stability: 0.5, fish: 'b347db033a6549378b48d00acb0d06cd', speed: 1.0, say: 'Samantha', rate: 175 }, // ElevenLabs voice Jonno picked; Fish fallback "Selene"
  },

  tactics: [
    { k: 'auth',    name: 'Authority impersonation', level: 'watch' },
    { k: 'urgency', name: 'Urgency',                 level: 'high' },
    { k: 'secrecy', name: 'Secrecy',                 level: 'high' },
    { k: 'payment', name: 'Gift card payment',       level: 'scam' },
    { k: 'remote',  name: 'Remote access app',       level: 'scam' },
  ],

  lines: [
    { id: 'ann',   who: 'ellie', kind: 'announce', gap: 0, text: 'This call is protected by Ellie.' },
    { id: 'c1',    who: 'caller', gap: 0.8, text: 'Good afternoon. Is this Mrs. Miller?' },
    { id: 'r1',    who: 'rose',   gap: 0.5, text: 'Yes, speaking. Who is this?' },
    { id: 'c2',    who: 'caller', gap: 0.4, text: 'This is Detective Weber, Berlin police, fraud department.',
      marks: [{ phrase: 'Detective Weber, Berlin police', tactic: 'auth' }] },
    { id: 'r2',    who: 'rose',   gap: 0.6, text: 'Police? Is something wrong?' },
    { id: 'c3',    who: 'caller', gap: 0.4, text: 'We arrested a gang last night. They had your name and your bank details. Your savings are at risk.' },
    { id: 'r3',    who: 'rose',   gap: 0.6, text: 'Oh my goodness. What should I do?' },
    { id: 'c4',    who: 'caller', gap: 0.4, text: 'We must act today, before the bank closes. And please, don’t tell anyone, not even your family. Bank staff may be involved.',
      marks: [{ phrase: 'We must act today', tactic: 'urgency' }, { phrase: 'don’t tell anyone, not even your family', tactic: 'secrecy' }] },
    { id: 'r4',    who: 'rose',   gap: 0.7, text: 'Not even my daughter?' },
    { id: 'c5',    who: 'caller', gap: 0.4, text: 'No one. Go to the shop now and buy €2,000 in Google Play cards. Then read me the codes.',
      say: 'No one. Go to the shop now and buy two thousand euros in Google Play cards. Then read me the codes.',
      marks: [{ phrase: 'buy €2,000 in Google Play cards', tactic: 'payment' }] },
    { id: 'coach', who: 'ellie', kind: 'coach', gap: 2.0, text: 'Rose, this is Ellie. This sounds like a scam. Real police never ask for gift cards. You can hang up now.' },
    { id: 'c6',    who: 'caller', gap: 0.5, text: 'Mrs. Miller? Are you still there?' },
    { id: 'r5',    who: 'rose',   gap: 0.6, text: 'I’m not buying anything. Goodbye.' },
  ],

  checks: [
    { after: 'c1', delay: 1.0, score: 6,  tactics: [], reason: 'Normal greeting. Nothing unusual yet.' },
    { after: 'c2', delay: 1.2, score: 35, tactics: ['auth'], summary: 'Claimed to be Berlin police', reason: 'Caller says he is police. Real police rarely cold-call about bank accounts.' },
    { after: 'c3', delay: 1.2, score: 52, tactics: [], reason: 'Claims her bank details were stolen. Fear is how these calls take control.' },
    { after: 'c4', delay: 1.2, score: 76, tactics: ['urgency', 'secrecy'], summary: 'Pushed her to act today and keep it from family', reason: 'Pressure to act today and keep it from family: the classic fake-police pattern.' },
    { after: 'c5', delay: 0.9, score: 94, tactics: ['payment'], summary: 'Asked for €2,000 in Google Play cards', reason: 'Asks for €2,000 in Google Play cards. Police never take gift cards. This is a scam.' },
  ],

  sms: 'Possible scam call to Mum right now. Caller said he was police and asked for €2,000 in gift cards. Ellie warned her.',
};
