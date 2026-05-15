import { useNavigate, Outlet } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useConstruction } from '../../context/ConstructionContext';
import DesktopSidebar from '../../components/desktop/DesktopSidebar';
import { useState, useCallback } from 'react';

// Sidebar widths kept in sync with DesktopSidebar.jsx
const SIDEBAR_EXPANDED  = 256; // w-64
const SIDEBAR_COLLAPSED = 56;  // w-14

function DesktopDashboard() {
    const navigate = useNavigate();
    const { user, loading } = useConstruction();

    // Persist collapse state across page reloads
    const [collapsed, setCollapsed] = useState(() =>
        localStorage.getItem('sb_collapsed') === 'true'
    );

    const handleToggle = useCallback(() => {
        setCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sb_collapsed', String(next));
            return next;
        });
    }, []);

    const handleLogout = async () => {
        await authService.logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-[var(--t-bg)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--t-primary)]" />
            </div>
        );
    }

    const navItems = [
        // Projects
        { id: 'projects',      icon: '🗂️',  label: 'Projects (परियोजनाहरू)'              },
        // Overview
        { id: 'home',          icon: '🏠',  label: 'Dashboard (ड्यासबोर्ड)'               },
        { id: 'analytics',     icon: '📈',  label: 'Analytics (विश्लेषण)'                 },
        { id: 'estimator',     icon: '🧮',  label: 'Estimator (इस्टिमेटर)'                },
        // Construction
        { id: 'permits',       icon: '📜',  label: 'Permits (नक्सा पास)'                  },
        { id: 'phases',        icon: '📋',  label: 'Phases & Tasks (चरण र कार्य)'          },
        { id: 'manage',        icon: '🛠️', label: 'Manage (व्यवस्थापन)'                  },
        { id: 'timeline',      icon: '📅',  label: 'Timeline (समयरेखा)'                   },
        { id: 'finance',       icon: '💰',  label: 'Finance (वित्त)'                      },
        { id: 'resource',      icon: '🧱',  label: 'Resource (स्रोत)'                     },
        { id: 'structure',     icon: '🏛️', label: 'Structure (संरचना)'                   },
        { id: 'photos',        icon: '📸',  label: 'Gallery (फोटो ग्यालरी)'               },
        { id: 'timelapse',     icon: '🎞️', label: 'Timelapse (टाइमल्याप्स)'               },
        // Team & HR
        { id: 'attendance',    icon: '🕐',  label: 'Workforce Attendance (हाजिरी)'         },
        { id: 'workforce',     icon: '👷',  label: 'Workforce (कार्यबल व्यवस्थापन)'        },
        { id: 'teams',         icon: '👥',  label: 'Team Management (टोली व्यवस्थापन)'     },
        { id: 'location',      icon: '📍',  label: 'Location (स्थान ट्र्याकिङ)'            },
        // Settings / Account
        { id: 'accounts',      icon: '👤',  label: 'Accounts (खाता)'                      },
        { id: 'guides',        icon: '📚',  label: 'User Guide (मद्दत निर्देशिका)'         },
        { id: 'data-transfer', icon: '🔄',  label: 'Data Transfer (डाटा स्थानान्तरण)'      },
    ];

    const sidebarW = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

    return (
        <div className="flex h-screen bg-[var(--t-bg)] overflow-hidden">
            <DesktopSidebar
                user={user}
                onLogout={handleLogout}
                navItems={navItems}
                collapsed={collapsed}
                onToggle={handleToggle}
            />

            {/* Main content — margin tracks sidebar width */}
            <main
                className="flex-1 overflow-y-auto min-h-screen"
                style={{
                    marginLeft: sidebarW,
                    transition: 'margin-left 0.22s cubic-bezier(0.4,0,0.2,1)',
                }}
            >
                <Outlet />
            </main>
        </div>
    );
}

export default DesktopDashboard;
