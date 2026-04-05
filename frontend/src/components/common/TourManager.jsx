import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useConstruction } from '../../context/ConstructionContext';

const TourManager = () => {
    const location = useLocation();
    const { dashboardData, updateGuideProgress, language } = useConstruction();
    const driverRef = useRef(null);

    const userGuides = dashboardData?.userGuides || [];
    const progressData = dashboardData?.userGuideProgress || [];

    useEffect(() => {
        const handleStartTour = (e) => {
            const guideKey = e.detail?.guideKey;
            const guide = userGuides.find(g => g.key === guideKey);
            if (guide) {
                startTour(guide, true);
            }
        };
        window.addEventListener('start-interactive-tour', handleStartTour);
        return () => window.removeEventListener('start-interactive-tour', handleStartTour);
    }, [userGuides, language]);

    // Check for auto-start
    useEffect(() => {
        // If there's an active driver, don't interrupt it.
        if (driverRef.current) return;

        let path = location.pathname.split('/').pop() || 'home';
        if (location.pathname === '/' || location.pathname === '/dashboard') path = 'home';
        
        const guide = userGuides.find(g => g.type === 'tour' && g.key === path);

        if (!guide) return;

        // Check if already completed
        const progress = progressData.find(p => p.guide === guide.id);
        if (progress && progress.is_completed) return;

        // Need to wait for rendering components
        const timer = setTimeout(() => {
             startTour(guide, false);
        }, 1200);

        return () => clearTimeout(timer);
    }, [location.pathname, userGuides, progressData, language]);

    const startTour = (guide, isManual) => {
        if (driverRef.current) {
            driverRef.current.destroy();
        }

        const isNe = language === 'ne';

        const steps = guide.steps.map(step => {
            const placement = step.placement || 'bottom';
            const element = step.target_element || '';
            const text = isNe ? step.text_ne : step.text_en;
            
            const stepObj = {
                popover: {
                    title: isNe ? guide.title_ne : guide.title_en,
                    description: text,
                    side: placement,
                    align: 'start'
                }
            };

            if (element) {
                 stepObj.element = element;
            }

            return stepObj;
        });

        if (steps.length === 0) return;

        const driverObj = driver({
            showProgress: true,
            animate: true,
            popoverClass: 'premium-driver-popover',
            nextBtnText: isNe ? 'अर्को ➔' : 'Next ➔',
            prevBtnText: isNe ? '⬅ अघिल्लो' : '⬅ Prev',
            doneBtnText: isNe ? 'सम्पन्न ✓' : 'Done ✓',
            steps: steps,
            onDestroyed: () => {
                driverRef.current = null;
                
                // If it was auto-started and now finished (or escaped), mark as completed
                if (!isManual) {
                    const progress = progressData.find(p => p.guide === guide.id);
                    if (!progress || !progress.is_completed) {
                         updateGuideProgress(guide.id, { is_completed: true });
                    }
                }
            }
        });

        driverRef.current = driverObj;
        driverObj.drive();
    };

    return null;
};

export default TourManager;
