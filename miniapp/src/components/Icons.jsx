function Svg({ children, size = 21, ...props }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props) {
  return (
    <Svg {...props}>
      <path d="M3.5 10.5 12 3.5l8.5 7v8a1 1 0 0 1-1 1h-4.5v-6h-6v6H4.5a1 1 0 0 1-1-1z" />
    </Svg>
  );
}

export function HistoryIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function ChartIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 4v15a1 1 0 0 0 1 1h15" />
      <path d="M8 16v-4" />
      <path d="M12.5 16V8" />
      <path d="M17 16v-6" />
    </Svg>
  );
}

export function SettingsIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 7h11" />
      <circle cx="17.5" cy="7" r="2" />
      <path d="M20 12H9" />
      <circle cx="6.5" cy="12" r="2" />
      <path d="M4 17h11" />
      <circle cx="17.5" cy="17" r="2" />
    </Svg>
  );
}

export function AddIcon(props) {
  return (
    <Svg size={24} {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function SparkleIcon(props) {
  return (
    <Svg size={17} {...props}>
      <path d="M12 3.5c.4 2.8 1 4.4 2.3 5.7 1.3 1.3 2.9 1.9 5.7 2.3-2.8.4-4.4 1-5.7 2.3-1.3 1.3-1.9 2.9-2.3 5.7-.4-2.8-1-4.4-2.3-5.7-1.3-1.3-2.9-1.9-5.7-2.3 2.8-.4 4.4-1 5.7-2.3 1.3-1.3 1.9-2.9 2.3-5.7z" />
    </Svg>
  );
}

export function SunIcon(props) {
  return (
    <Svg size={18} {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2" />
      <path d="M12 19.3v2.2" />
      <path d="M4.2 4.2l1.6 1.6" />
      <path d="M18.2 18.2l1.6 1.6" />
      <path d="M2.5 12h2.2" />
      <path d="M19.3 12h2.2" />
      <path d="M4.2 19.8l1.6-1.6" />
      <path d="M18.2 5.8l1.6-1.6" />
    </Svg>
  );
}

export function MoonIcon(props) {
  return (
    <Svg size={18} {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
    </Svg>
  );
}

export function SearchIcon(props) {
  return (
    <Svg size={18} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.3-4.3" />
    </Svg>
  );
}

export function CloseIcon(props) {
  return (
    <Svg size={13} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function EmptyIcon(props) {
  return (
    <Svg size={28} {...props}>
      <rect x="5" y="8" width="14" height="12" rx="2" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Svg>
  );
}

export function EditIcon(props) {
  return (
    <Svg size={16} {...props}>
      <path d="M4 20h4l11-11-4-4L4 16z" />
      <path d="M14 5l4 4" />
    </Svg>
  );
}

export function TrashIcon(props) {
  return (
    <Svg size={16} {...props}>
      <path d="M5 7h14" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
    </Svg>
  );
}

export function TagIcon(props) {
  return (
    <Svg size={18} {...props}>
      <path d="M12.5 3H5a2 2 0 0 0-2 2v7.5a2 2 0 0 0 .6 1.4l8 8a2 2 0 0 0 2.8 0l6.5-6.5a2 2 0 0 0 0-2.8l-8-8A2 2 0 0 0 12.5 3z" />
      <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function ChevronIcon(props) {
  return (
    <Svg size={16} {...props}>
      <path d="M9 5l7 7-7 7" />
    </Svg>
  );
}

export function BackIcon(props) {
  return (
    <Svg size={18} {...props}>
      <path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}

export function DollarIcon(props) {
  return (
    <Svg size={20} {...props}>
      <path d="M12 2.5v19M16.5 7.2a4.2 4.2 0 0 0-4.2-3.1h-.8a3.6 3.6 0 0 0 0 7.2h1a3.6 3.6 0 0 1 0 7.2h-.8a4.2 4.2 0 0 1-4.2-3.1" />
    </Svg>
  );
}

export function RefreshIcon(props) {
  return (
    <Svg size={19} {...props}>
      <path d="M4 11a8 8 0 0 1 14-5.3M20 5v5h-5" />
      <path d="M20 13a8 8 0 0 1-14 5.3M4 19v-5h5" />
    </Svg>
  );
}

export function FilterIcon(props) {
  return (
    <Svg size={15} {...props}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </Svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <Svg size={13} {...props}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function CheckIcon(props) {
  return (
    <Svg size={11} {...props}>
      <path d="M5 12l4.5 4.5L19 7" />
    </Svg>
  );
}

export function TrendUpIcon(props) {
  return (
    <Svg size={13} {...props}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  );
}

export function TrendDownIcon(props) {
  return (
    <Svg size={13} {...props}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </Svg>
  );
}

export const CATEGORY_ICON_COMPONENTS = {
  food_dining(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M7 3v7a1.5 1.5 0 0 0 3 0V3" />
        <path d="M8.5 10v11" />
        <path d="M16 3c-1.4 0-2.5 1.8-2.5 5s1.1 4 2.5 4v9" />
      </Svg>
    );
  },
  groceries(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M5 8h14l-1.2 11a1.5 1.5 0 0 1-1.5 1.4H7.7A1.5 1.5 0 0 1 6.2 19z" />
        <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
      </Svg>
    );
  },
  transportation(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M4 16V11a2 2 0 0 1 1.4-1.9L7 8.5h10l1.6.6A2 2 0 0 1 20 11v5" />
        <path d="M4 16h16" />
        <circle cx="7.5" cy="16.5" r="1.4" />
        <circle cx="16.5" cy="16.5" r="1.4" />
      </Svg>
    );
  },
  coffee(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" />
        <path d="M16 10.5h1.5a2.2 2.2 0 0 1 0 4.4H16" />
        <path d="M8 6c0-1 1-1 1-2s-1-1-1-2" />
        <path d="M12 6c0-1 1-1 1-2s-1-1-1-2" />
      </Svg>
    );
  },
  entertainment(props) {
    return (
      <Svg size={19} {...props}>
        <rect x="4" y="6.5" width="16" height="12" rx="1.5" />
        <path d="M4 10h16" />
        <path d="M8 6.5 6 10M14 6.5l-2 3.5M20 6.5l-2 3.5" />
      </Svg>
    );
  },
  subscriptions(props) {
    return (
      <Svg size={19} {...props}>
        <rect x="3.5" y="5" width="17" height="11" rx="1.5" />
        <path d="M9 20h6" />
        <path d="M12 16v4" />
      </Svg>
    );
  },
  health(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M12 20s-7-4.4-9-8.5C1.6 8 3.3 5 6.3 5c1.7 0 3 .9 3.7 2.2C10.7 5.9 12 5 13.7 5c3 0 4.7 3 3.3 6.5C15 15.6 12 20 12 20z" />
      </Svg>
    );
  },
  nastaran(props) {
    return (
      <Svg size={19} {...props}>
        <circle cx="12" cy="12" r="2.2" />
        <path d="M12 9.8c0-2.3-1.3-3.8-2.6-4.8 1.8-.4 3.6.3 4.6 1.9" />
        <path d="M14.2 12c2.3 0 3.8-1.3 4.8-2.6-.4 1.8-1.1 3.6-2.9 4.6" />
        <path d="M12 14.2c0 2.3 1.3 3.8 2.6 4.8-1.8.4-3.6-.3-4.6-1.9" />
        <path d="M9.8 12c-2.3 0-3.8 1.3-4.8 2.6.4-1.8 1.1-3.6 2.9-4.6" />
      </Svg>
    );
  },
  shopping(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M6 8h12l-1 12a1.5 1.5 0 0 1-1.5 1.4h-7A1.5 1.5 0 0 1 7 20z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        <path d="M6 11.5h12" />
      </Svg>
    );
  },
  housing(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
        <path d="M10 20v-5.5h4V20" />
      </Svg>
    );
  },
  education(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M4 6.5C6 5.3 9 5 12 6.3c3-1.3 6-1 8 .2v11c-2-1.2-5-1.5-8-.2-3-1.3-6-1-8 .2z" />
        <path d="M12 6.3v11" />
      </Svg>
    );
  },
  personal_care(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M12 3c2.5 3 3.8 5.8 3.8 8.2a3.8 3.8 0 1 1-7.6 0C8.2 8.8 9.5 6 12 3z" />
      </Svg>
    );
  },
  travel(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M3 14.5 21 7l-7 8.5-3.5-1.5L14 10l-4.5 3-4-1z" />
      </Svg>
    );
  },
  gifts(props) {
    return (
      <Svg size={19} {...props}>
        <rect x="4" y="9.5" width="16" height="10" rx="1.2" />
        <path d="M4 13h16" />
        <path d="M12 9.5V20" />
        <path d="M12 9.5c-1-3-3-3.5-4-2.5s.2 2.5 4 2.5z" />
        <path d="M12 9.5c1-3 3-3.5 4-2.5s-.2 2.5-4 2.5z" />
      </Svg>
    );
  },
  utilities(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M13 3 5 13.5h5.5L11 21l8-10.5h-5.5z" />
      </Svg>
    );
  },
  car(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M6.5 15V9.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1V15" />
        <path d="M4.5 15h15v3a.8.8 0 0 1-.8.8h-1.4a.8.8 0 0 1-.8-.8v-1H7v1a.8.8 0 0 1-.8.8H4.8a.8.8 0 0 1-.8-.8z" />
        <path d="M9 5.5h6l1 3H8z" />
      </Svg>
    );
  },
  debts(props) {
    return (
      <Svg size={19} {...props}>
        <circle cx="8" cy="8" r="2.2" />
        <circle cx="16" cy="16" r="2.2" />
        <path d="M18 6 6 18" />
      </Svg>
    );
  },
  other(props) {
    return (
      <Svg size={19} {...props}>
        <circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" />
      </Svg>
    );
  },
};

export const GENERIC_ICON_COMPONENTS = {
  star(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M12 3.5l2.3 4.9 5.3.6-3.9 3.7 1 5.3L12 15.4l-4.7 2.6 1-5.3-3.9-3.7 5.3-.6z" />
      </Svg>
    );
  },
  bookmark(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1z" />
      </Svg>
    );
  },
  flag(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M5 21V4" />
        <path d="M5 4.5c2-1.3 4-1.3 6 0s4 1.3 6 0v9c-2 1.3-4 1.3-6 0s-4-1.3-6 0z" />
      </Svg>
    );
  },
  briefcase(props) {
    return (
      <Svg size={19} {...props}>
        <rect x="3.5" y="8" width="17" height="11" rx="1.5" />
        <path d="M8.5 8V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" />
        <path d="M3.5 13h17" />
      </Svg>
    );
  },
  paw(props) {
    return (
      <Svg size={19} {...props}>
        <circle cx="7" cy="8" r="1.6" />
        <circle cx="12" cy="6.5" r="1.6" />
        <circle cx="17" cy="8" r="1.6" />
        <circle cx="19" cy="12.5" r="1.6" />
        <path d="M12 12c-3 0-5.5 2.2-5.5 5a2.7 2.7 0 0 0 4.3 2.2 3 3 0 0 1 2.4 0A2.7 2.7 0 0 0 17.5 17c0-2.8-2.5-5-5.5-5z" />
      </Svg>
    );
  },
  music(props) {
    return (
      <Svg size={19} {...props}>
        <circle cx="7" cy="18" r="2.3" />
        <circle cx="17" cy="16" r="2.3" />
        <path d="M9.3 18V5.5L19.3 4v12" />
      </Svg>
    );
  },
  camera(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
        <circle cx="12" cy="13" r="3.2" />
      </Svg>
    );
  },
  umbrella(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M12 3.5c4.7 0 8.5 3.6 8.5 8h-17c0-4.4 3.8-8 8.5-8z" />
        <path d="M12 11.5V19a2 2 0 0 1-3.5 1.3" />
      </Svg>
    );
  },
  trophy(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
        <path d="M10 17.5h4M12 14v3.5" />
        <path d="M8.5 20.5h7" />
      </Svg>
    );
  },
  leaf(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M20 4C10 4 4 10 4 18c8 0 14-6 16-14z" />
        <path d="M6 18c3-5 7-9 12-12" />
      </Svg>
    );
  },
  wrench(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M14.5 3.5a4.5 4.5 0 0 0-6 4.9L4 12.9l3 3 4.5-4.5a4.5 4.5 0 0 0 5-5.9L14 8l-2-2z" />
      </Svg>
    );
  },
  dumbbell(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M6 9v6M4 10v4M18 9v6M20 10v4" />
        <path d="M8 12h8" />
        <rect x="6" y="8" width="3" height="8" rx="1" />
        <rect x="15" y="8" width="3" height="8" rx="1" />
      </Svg>
    );
  },
  phone(props) {
    return (
      <Svg size={19} {...props}>
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M11 18h2" />
      </Svg>
    );
  },
  cup(props) {
    return (
      <Svg size={19} {...props}>
        <path d="M8 3h8l-1 13a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
        <path d="M6 21h12" />
        <path d="M12 18v3" />
      </Svg>
    );
  },
  anchor(props) {
    return (
      <Svg size={19} {...props}>
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v14" />
        <path d="M5 13a7 7 0 0 0 14 0" />
        <path d="M8 10h8" />
      </Svg>
    );
  },
  target(props) {
    return (
      <Svg size={19} {...props}>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </Svg>
    );
  },
};

export const GENERIC_ICON_KEYS = Object.keys(GENERIC_ICON_COMPONENTS);

export function CategoryIcon({ category, icon, ...props }) {
  const Icon =
    (icon && GENERIC_ICON_COMPONENTS[icon]) ??
    CATEGORY_ICON_COMPONENTS[category] ??
    CATEGORY_ICON_COMPONENTS.other;
  return <Icon {...props} />;
}
