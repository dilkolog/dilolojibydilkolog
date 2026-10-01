import { createScheduler } from '../engine/scheduler'
import { KelimeDB } from './db'

/** The app's single database and scheduler. */
export const db = new KelimeDB()
export const scheduler = createScheduler()
