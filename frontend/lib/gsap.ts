// GSAP Core + ALL Plugins (Now 100% FREE thanks to Webflow!)
// This file registers all GSAP plugins for use throughout the app

import { gsap } from 'gsap';

// Core Plugins
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { Flip } from 'gsap/Flip';
import { Draggable } from 'gsap/Draggable';
import { Observer } from 'gsap/Observer';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { TextPlugin } from 'gsap/TextPlugin';

// Premium Plugins (Now FREE!)
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import { PhysicsPropsPlugin } from 'gsap/PhysicsPropsPlugin';
import { GSDevTools } from 'gsap/GSDevTools';
import { MotionPathHelper } from 'gsap/MotionPathHelper';
import { CustomEase } from 'gsap/CustomEase';
import { CustomWiggle } from 'gsap/CustomWiggle';
import { CustomBounce } from 'gsap/CustomBounce';

// Register ALL plugins
gsap.registerPlugin(
  // Core
  ScrollTrigger,
  ScrollToPlugin,
  Flip,
  Draggable,
  Observer,
  MotionPathPlugin,
  TextPlugin,
  // Premium (Now FREE!)
  ScrollSmoother,
  DrawSVGPlugin,
  MorphSVGPlugin,
  SplitText,
  ScrambleTextPlugin,
  InertiaPlugin,
  Physics2DPlugin,
  PhysicsPropsPlugin,
  GSDevTools,
  MotionPathHelper,
  CustomEase,
  CustomWiggle,
  CustomBounce
);

// Export everything for easy imports
export {
  gsap,
  // Core
  ScrollTrigger,
  ScrollToPlugin,
  Flip,
  Draggable,
  Observer,
  MotionPathPlugin,
  TextPlugin,
  // Premium (Now FREE!)
  ScrollSmoother,
  DrawSVGPlugin,
  MorphSVGPlugin,
  SplitText,
  ScrambleTextPlugin,
  InertiaPlugin,
  Physics2DPlugin,
  PhysicsPropsPlugin,
  GSDevTools,
  MotionPathHelper,
  CustomEase,
  CustomWiggle,
  CustomBounce
};

// Default export for convenience
export default gsap;
