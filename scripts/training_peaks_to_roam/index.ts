import puppeteer from "puppeteer-core"
import { setupRoam } from '../../lib/roam'
import { format } from 'date-fns'

require("dotenv").config();
const tpUsername = process.env.TRAINING_PEAKS_USERNAME
const tpPassword = process.env.TRAINING_PEAKS_PASS
const roamEmail = process.env.ROAM_EMAIL
const roamPassword = process.env.ROAM_PASSWORD
const chromeLoc = process.env.CHROME_LOC

if (!tpUsername || !tpPassword || !chromeLoc || !roamEmail || !roamPassword) {
  console.error("TRAINING_PEAKS_PASS, TRAINING_PEAKS_USERNAME, or CHROME_LOC are not set")
  process.exit(1)
}

const login = async (page : puppeteer.Page) => {
  await page.type("#Username", tpUsername, {
    delay: 200,
  });
  await page.type("#Password", tpPassword, { delay: 100 });

  await page.click("#btnSubmit");
};

const openCalendar = async (page : puppeteer.Page) => {
  const calendarButton = ".appHeaderMainNavigationButtons.calendar"
  await page.waitForSelector(calendarButton);
  // it seems like more needs to load before it can click the calendar
  await page.waitForTimeout(2000);
  await page.click(calendarButton);
};


type Workout = 
  | { type: 'run', title: string, distance: string, note: string, description: string, day: string }
  | { type: 'strength', title: string, note: string, description: string, day: string }
  | { type: 'core', title: string, note: string, description: string, day: string }
  | { type: 'unknown', title: string, note: string, description: string, day: string }

const parseCalendar = async (page : puppeteer.Page) => {
  await page.waitForTimeout(5000);
  return page.$$eval(".thisWeek .day", async (days) => {
    const delay = (ms:number)=>new Promise(r => setTimeout(r,ms))
    const formatWorkout = async (w : HTMLElement, day: string) : Promise<Workout> => {
      let note = w.querySelector<HTMLDivElement>(".coachComments")?.innerText || "";
      if (note.includes("...")) {
        await delay(250);
        w.click();
        await delay(250);
        note = document.querySelector<HTMLDivElement>("#preActivityCommentsInput")?.innerText || ''
        await delay(250);
        document.querySelector<HTMLButtonElement>("#closeIcon")?.click();
      }

      let description = w.querySelector<HTMLDivElement>(".description")?.innerText || ''
      let title = w.querySelector<HTMLDivElement>(".workoutTitle")?.innerText || ''

      if (w.classList.contains("Strength")) {
        return {
          type: 'strength',
          title,
          description,
          note,
          day
        }
      } else if (w.classList.contains('Run')) {
        return {
          type: 'run',
          title,
          distance: w.querySelector<HTMLDivElement>(".distance .value")?.innerText || '',
          description,
          note,
          day
        }
      } else {
        return {
          type: title.toLowerCase().includes('core') ? 'core' : 'unknown',
          title,
          description,
          note,
          day
        }
      }
    };

    let workouts = []
    for (let day of days) {
      if (!(day instanceof HTMLElement)) continue
      const dayString = day.dataset.date
      if (!dayString) continue

      let nodes = day.querySelectorAll<HTMLDivElement>(".workout")
      for (let node of nodes) {
        let workout = await formatWorkout(node, dayString)
        workouts.push(workout)
      }
    }

    return workouts
  });
};

const capitalize = (s:string) => {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: process.env.CHROME_LOC
  });
  const page = await browser.newPage();
  await page.goto("https://home.trainingpeaks.com/login");
  await login(page);
  await openCalendar(page);
  const events = await parseCalendar(page);
  browser.close()

  const today = new Date().toISOString().split('T')[0]
  const todayEvents = events.filter(workout => workout.day === today)
  const roam = await setupRoam({ password: roamPassword, email: roamEmail, graph: 'Hehk' })
  const todayPage = await roam.getPage(format(new Date(), 'LLLL do, yyyy'))
  if (!todayPage) throw new Error("Failed to find the today roam page")
  for (const event of todayEvents) {
    let content = `#Workout ${event.title}`
    switch (event.type) {
      case 'run': 
      case 'core': 
      case 'strength': content = `#Workout/${capitalize(event.type)} ${event.title}`
    }
    console.log(content)
    await roam.createBlock(todayPage, {
      string: content
    }, -1)
  }

  roam.close()
})();
