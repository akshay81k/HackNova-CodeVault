export const RealisticVaultIcon = ({ size = 22, color = "#fff" }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Body Base */}
        <rect x="4" y="4" width="92" height="92" rx="12" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="6" />
        
        {/* Vault Door */}
        <rect x="16" y="16" width="68" height="68" rx="8" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="4" />
        
        {/* Corner Rivets */}
        <circle cx="26" cy="26" r="3" fill={color} />
        <circle cx="74" cy="26" r="3" fill={color} />
        <circle cx="26" cy="74" r="3" fill={color} />
        <circle cx="74" cy="74" r="3" fill={color} />

        {/* Dial Outer Ring */}
        <circle cx="50" cy="46" r="18" fill="none" stroke={color} strokeWidth="4" />
        
        {/* Dial Spokes */}
        <path d="M50 28 L50 34 M50 58 L50 64 M32 46 L38 46 M62 46 L68 46" stroke={color} strokeWidth="4" strokeLinecap="round" />
        
        {/* Dial Center Hub */}
        <circle cx="50" cy="46" r="6" fill={color} />
        
        {/* Keypad Indicator */}
        <rect x="42" y="74" width="16" height="5" rx="2" fill={color} />
    </svg>
);
