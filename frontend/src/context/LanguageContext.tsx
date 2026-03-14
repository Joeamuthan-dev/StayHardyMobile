import React, { createContext, useContext, useState } from 'react';

export type Language = 'English' | 'Tamil';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  English: {
    settings: 'Settings',
    personalize: 'Personalize your experience',
    app_settings: 'App Settings',
    appearance: 'Appearance',
    language: 'Language',
    security: 'Security',
    change_pin: 'Change PIN',
    support: 'Support',
    send_tips: 'Send tips to developer',
    sign_out: 'Sign Out',
    home: 'Home',
    timeline: 'AllTasks',
    stats: 'Stats',
    profile: 'Profile',
    daily_goal: 'Daily Goal',
    pending: 'Pending',
    active_tasks: 'Active Tasks',
    today_focus: 'Today\'s Focus',
    all_milestones: 'All Milestones',
    view_all: 'View All',
    new_task: 'New Task',
    edit_task: 'Edit Task',
    task_name: 'TASK NAME',
    description: 'DESCRIPTION',
    categories: 'CATEGORIES',
    priority: 'PRIORITY',
    save_task: 'Save Task',
    update_milestone: 'Update Milestone',
    productivity: 'Productivity',
    add: 'Add',
    cancel: 'Cancel',
    weekly_recap: 'Weekly Recap',
    performance_overview: 'Performance overview',
    real_time: 'Real-time',
    generated: 'Generated',
    tasks: 'Tasks',
    efficiency: 'Efficiency',
    rate: 'Rate',
    productivity_score: 'Productivity Score',
    overall_completion: 'Overall completion',
    completed: 'Completed',
    focus_day: 'Focus Day',
    category_impact: 'Category Impact',
    new_pin: 'New 4-Digit PIN',
    confirm_pin: 'Confirm New PIN',
    update_pin: 'Update PIN',
    pin_mismatch: 'PINs do not match',
    pin_success: 'PIN updated successfully!',
    enter_4_digits: 'Enter 4 digits',
    goals: 'Goals',
    add_visual: 'Add Visual',
    description_vision: 'Description & Vision',
    define_milestone: 'Define Your Goal',
    what_achieve: 'What do you want to achieve?',
    path_success: 'Describe your path to success...'
  },
  Tamil: {
    settings: 'அமைப்புகள்',
    personalize: 'உங்கள் அனுபவத்தைத் தனிப்பயனாக்குங்கள்',
    app_settings: 'பயன்பாட்டு அமைப்புகள்',
    appearance: 'தோற்றம்',
    language: 'மொழி',
    security: 'பாதுகாப்பு',
    change_pin: 'பின் எண்ணை மாற்றவும்',
    support: 'ஆதரவு',
    send_tips: 'உருவாக்குபவருக்கு டிப்ஸ் அனுப்பவும்',
    sign_out: 'வெளியேறு',
    home: 'முகப்பு',
    timeline: 'அனைத்து பணிகள்',
    stats: 'புள்ளிவிவரம்',
    profile: 'சுயவிவரம்',
    daily_goal: 'தினசரி இலக்கு',
    pending: 'மறுபதிவு',
    active_tasks: 'செயலில் உள்ள பணிகள்',
    today_focus: 'இன்றைய கவனம்',
    all_milestones: 'அனைத்து மைல்கற்கள்',
    view_all: 'அனைத்தையும் பார்',
    new_task: 'புதிய பணி',
    edit_task: 'பணியைத் திருத்து',
    task_name: 'பணியின் பெயர்',
    description: 'விளக்கம்',
    categories: 'வகைகள்',
    priority: 'முன்னுரிமை',
    save_task: 'பணியைச் சேமிக்கவும்',
    update_milestone: 'மைல்கல்லைப் புதுப்பிக்கவும்',
    productivity: 'உற்பத்தித்திறன்',
    add: 'சேர்',
    cancel: 'ரத்து செய்',
    weekly_recap: 'வாராந்திர சுருக்கம்',
    performance_overview: 'செயல்திறன் கண்ணோட்டம்',
    real_time: 'நேரடி',
    generated: 'உருவாக்கப்பட்டது',
    tasks: 'பணிகள்',
    efficiency: 'திறன்',
    rate: 'விகிதம்',
    productivity_score: 'உற்பத்தித்திறன் மதிப்பெண்',
    overall_completion: 'ஒட்டுமொத்த நிறைவு',
    completed: 'முடிந்தது',
    focus_day: 'கவன நாள்',
    category_impact: 'வகையின் தாக்கம்',
    new_pin: 'புதிய 4-இலக்க பின்',
    confirm_pin: 'புதிய பின்னை உறுதிப்படுத்தவும்',
    update_pin: 'பின்னைப் புதுப்பிக்கவும்',
    pin_mismatch: 'பின் எண்கள் பொருந்தவில்லை',
    pin_success: 'பின் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!',
    enter_4_digits: '4 இலக்கங்களை உள்ளிடவும்',
    goals: 'இலக்குகள்',
    add_visual: 'காட்சியைச் சேர்க்கவும்',
    description_vision: 'விளக்கம் மற்றும் பார்வை',
    define_milestone: 'உங்கள் இலக்கை வரையறுக்கவும்',
    what_achieve: 'நீங்கள் எதைச் சாதிக்க விரும்புகிறீர்கள்?',
    path_success: 'வெற்றிக்கான உங்கள் பாதையை விவரிக்கவும்...'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'English';
  });

  const setLanguage = (lang: Language) => {
    localStorage.setItem('language', lang);
    setLanguageState(lang);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
