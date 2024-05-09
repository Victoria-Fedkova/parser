import puppeteer from "puppeteer";

export const getPageTitle = async (page) => {
  // console.log("Getting page title...");
  try {
    return await page.evaluate(() => {
      const titleElement = document.querySelector("h1.post__title");
      const title = titleElement ? titleElement.innerText.trim() : null;
      return title;
    });
  } catch (error) {
    console.error("Error getting page title:", error);
    return null;
  }
};

export const getPostDescription = async (page) => {
  // console.log("Getting page description...");
  try {
    return await page.evaluate(() => {
      const descriptionElement = document.querySelector(".post__lead");
      const description = descriptionElement
        ? descriptionElement.innerText.trim()
        : null;
      return description;
    });
  } catch (error) {
    console.error("Error getting page description:", error);
    return null;
  }
};

export const getMeinInf = async (page) => {
  // console.log("Getting main information from the page...");
  const meinInf = await page.evaluate(() => {
    const parentDiv = document.querySelector(".post-content");
    const postContent = [];

    const getTextFromNestedElements = (element) => {
      let text = "";
      element.childNodes.forEach((child) => {
        if (child.nodeType === 3) {
          // Text node
          text += child.textContent.trim();
        } else if (child.nodeType === 1) {
          // Element node
          text += getTextFromNestedElements(child);
        }
      });
      return text;
    };

    parentDiv.querySelectorAll("p, h2, figure, blockquote").forEach((child) => {
      let text = "";
      if (child.tagName === "P") {
        // Если у элемента есть атрибут data-ct-non-breakable, собираем текст из всех вложенных элементов
        if (child.hasAttribute("data-ct-non-breakable")) {
          text = getTextFromNestedElements(child);
        } else if (child.parentElement === parentDiv) {
          // Иначе, если элемент прямой ребенок и не имеет атрибута, собираем текстовый контент элемента
          text = child.textContent.trim();
        }
        postContent.push(`P: ${text}`);
      } else if (child.tagName === "H2" || child.tagName === "BLOCKQUOTE") {
        text = getTextFromNestedElements(child);
        postContent.push(`${child.tagName}: ${text}`);
      } else if (child.tagName === "FIGURE") {
        const src = child.querySelector("img")
          ? child.querySelector("img").getAttribute("src")
          : "";
        postContent.push(`FIGURE: ${src}`);
      }
    });

    return postContent.join("\n");
  });

  return meinInf;
};

const getPostLinksFromPage = async (page) => {
  // console.log("Fetching initial post links...");
  let allPost = new Set();

  const collectLinks = async () => {
    try {
      const links = await page.evaluate(() => {
        const currentDate = new Date().toISOString().slice(0, 10);
        const linkElements = Array.from(
          document.querySelectorAll("article.post-card-inline")
        );
        return linkElements
          .map((article) => {
            const publicationDateElement = article.querySelector(
              ".post-card-inline__date"
            );
            const publicationDate = publicationDateElement
              ? publicationDateElement.getAttribute("datetime")
              : null;
            if (publicationDate === currentDate) {
              const link = article.querySelector(
                "a.post-card-inline__figure-link"
              );
              const href = link ? link.href : null;
              if (href && href.includes("https://cointelegraph.com/news/")) {
                return href.startsWith("http")
                  ? href
                  : `https://cointelegraph.com${link.getAttribute("href")}`;
              }
            }
            return null;
          })
          .filter((link) => link !== null);
      });
      links.forEach((link) => allPost.add(link));
    } catch (error) {
      console.error("Failed to collect links:", error);
      return [];
    }
  };

  await collectLinks();
  let previousSize = 0;
  let newSize = allPost.size;

  while (newSize > previousSize) {
    previousSize = newSize;

    // console.log("Starting auto-scroll...");
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let lastScrollTop = document.body.scrollHeight;
        const interval = setInterval(() => {
          window.scrollBy(0, 2000);
          const currentScrollTop = document.body.scrollHeight;
          if (currentScrollTop === lastScrollTop) {
            clearInterval(interval);
            resolve();
          } else {
            lastScrollTop = currentScrollTop;
          }
        }, 5000);
      });
    });
    console.log("Auto-scroll completed.");

    await collectLinks();
    newSize = allPost.size;
    console.log(`Found links: ${newSize}`);
  }

  return Array.from(allPost);
};

export const getAllPostLinks = async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto("https://cointelegraph.com/tags/bitcoin");
  const allPostLinks = await getPostLinksFromPage(page);
  await browser.close();
  console.log("allPostLinks", allPostLinks);
  return allPostLinks;
};

export const addNewPost = async (postDonorSlug) => {
  // console.log("Adding new post:", postDonorSlug);
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto(postDonorSlug);
  const title = await getPageTitle(page);
  const descrription = await getPostDescription(page);
  const content = await getMeinInf(page);
  await browser.close();
  return { title, descrription, content };
};
