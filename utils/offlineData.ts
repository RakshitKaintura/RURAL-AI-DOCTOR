
import { OfflineGuide } from '../types';

export const OFFLINE_GUIDES: OfflineGuide[] = [
  {
    id: 'cpr',
    title: 'CPR (No Breathing)',
    icon: '🫀',
    steps: [
      'Call for help immediately.',
      'Place hands on center of chest.',
      'Push hard and fast (100-120 times/minute).',
      'Allow chest to rise back up after each push.',
      'Continue until help arrives.'
    ],
    warning: 'Only stop if the person starts breathing or help arrives.'
  },
  {
    id: 'bleeding',
    title: 'Heavy Bleeding',
    icon: '🩸',
    steps: [
      'Apply direct pressure on the wound with a clean cloth.',
      'Keep pressure for at least 10-15 minutes.',
      'If blood soaks through, add more cloth on top (do not remove first one).',
      'Raise the injured part above heart level if possible.'
    ],
    warning: 'Do not remove the object if something is stuck inside the wound.'
  },
  {
    id: 'burns',
    title: 'Severe Burns',
    icon: '🔥',
    steps: [
      'Cool the burn under cool (not cold) running water for 20 minutes.',
      'Remove jewelry or tight clothing near burn before swelling starts.',
      'Cover loosely with clean cling film or a plastic bag.'
    ],
    warning: 'Do not use ice, butter, or creams on severe burns.'
  },
  {
    id: 'stroke',
    title: 'Stroke Signs',
    icon: '🧠',
    steps: [
      'Face: Ask them to smile. Does one side droop?',
      'Arms: Ask them to raise both arms. Does one drift down?',
      'Speech: Ask them to repeat a simple phrase. Is it slurred?',
      'Time: If you see any of these, call emergency immediately.'
    ],
    warning: 'Do not give them food or water.'
  },
  {
    id: 'choking',
    title: 'Choking',
    icon: '🤢',
    steps: [
      'Encourage them to cough.',
      'Give 5 back blows between shoulder blades.',
      'Give 5 abdominal thrusts (Heimlich maneuver) if still choking.',
      'Repeat cycle until object clears.'
    ],
    warning: 'Call emergency if they lose consciousness.'
  }
];
