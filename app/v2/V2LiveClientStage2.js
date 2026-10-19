'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import baseStyles from './v2.module.css';
import extraStyles from './v2-extra.module.css';
import liveStyles from './v2-live.module.css';
import aiStyles from './v2-ai-live.module.css';
import RewardLiveClient from './reward/RewardLiveClient';
import V3EventExperience from './V3EventExperience';

/* V3 wiring marker. Full business logic remains in the existing client; the event presentation is delegated to V3EventExperience. */
