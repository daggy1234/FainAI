const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
import * as cheerio from "cheerio";
import { parse } from "node-html-parser";

const user_data =
  "/Users/arnavjindal/Library/Application Support/Google/Chrome";
const profile = "Profile 2";
const allTextItems = [];
const profilePath = `${user_data}/${profile}`;
let pageIndex = 0;
let currInd = 1;

function parseTimeToSeconds(time: string): number {
  const parts = time.split(":").map(Number);
  let seconds = 0;
  if (parts.length === 3) {
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    seconds = parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    seconds = parts[0];
  }
  return seconds;
}

(async () => {
  // Launch a new browser instance

  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const contexts = browser.contexts();
  const pages = contexts[0].pages();
  const page = pages[0];
  const url = page.url();
  console.log(url);
  if (
    !url.startsWith("https://duke.hosted.panopto.com/Panopto/Pages/Sessions")
  ) {
    console.log("Please open PANOPTO folder");
    return;
  }
  console.log("Scraping started");
  await page.waitForSelector("#listViewContainer");
  // Find the table with id listViewContainer and get its inner HTML
  const tableHTML = await page.$eval(
    "#listViewContainer",
    (element: any) => element.innerHTML
  );

  console.log("GOT TABLES");
  console.log(tableHTML);
  const root = parse(tableHTML);
  const rows = root.querySelectorAll("tr");
  const vid_ids: string[] = [];
  rows.forEach((row: any) => {
    if (!row.id.startsWith("list")) {
      vid_ids.push(row.id.toString());
    }
  });
  console.log(vid_ids);
  for (const id of vid_ids) {
    const videoUrl = `https://duke.hosted.panopto.com/Panopto/Pages/Viewer.aspx?id=${id}`;
    await page.goto(videoUrl);
    await page.waitForTimeout(2000);
    await page.$eval("video", (element: any) => {
      element.play();
    });
    // Find the element with id transcriptTabHeader and click on it
    //   const transcriptTabHeader = await page.$("#transcriptTabHeader");
    console.log("WAITING FOR PAGE");

    const tab_header = await page.$eval(
      "#transcriptTabPane",
      (element: any) => element.innerHTML
    );
    let $ = cheerio.load(tab_header);
    const listItems = $("ul.event-tab-list li");
    const captions_arr: { time: number; text: string }[] = [];
    listItems.each((index, element) => {
      const time = $(element).find(".event-time").text();
      const text = $(element).find(".event-text span").text();
      captions_arr.push({ time: parseTimeToSeconds(time), text: text });
    });

    const slides_header = await page.$eval(
      "#thumbnailList",
      (element: any) => element.innerHTML
    );
    $ = cheerio.load(slides_header);
    const slideItems = $("li");
    const slides_arr: { time: number; image: string }[] = [];
    slideItems.each((index, element) => {
      const time = $(element).find(".thumbnail-timestamp").text();
      const imageUrl = $(element).find("img").attr("src");
      slides_arr.push({
        time: parseTimeToSeconds(time),
        image: imageUrl || "OOPS",
      });
    });
    console.log(slides_arr);
    console.log(captions_arr);
    const proc_final_arr: {
      start_time: number;
      end_time: number;
      image: string;
      captions: string[];
    }[] = [];
    for (let i = 0; i < slides_arr.length; i += 2) {
      const slide1 = slides_arr[i];
      const slide2 = slides_arr[i + 1] || { time: 1000000, image: "" };
      const selected_captions = captions_arr.filter(
        (caption) => caption.time >= slide1.time && caption.time < slide2.time
      );
      proc_final_arr.push({
        start_time: slide1.time,
        end_time: slide2.time,
        image: slide1.image,
        captions: selected_captions.map((caption) => caption.text),
      });
      // Do something with slide1 and slide2
    }
    fs.writeFileSync(
      `captions/${id}.json`,
      JSON.stringify({ data: proc_final_arr })
    );
  }
})();
