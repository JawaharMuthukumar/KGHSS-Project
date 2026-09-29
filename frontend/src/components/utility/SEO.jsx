import { useEffect } from "react";

const SITE_NAME = "Government Higher Secondary School, Kangayampalayam";

function setMetaTag(attr, key, content) {
  if (!content) return;
  let tag = document.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/**
 * Lightweight, dependency-free SEO helper: sets the document title and key
 * meta tags per page. Kept intentionally small rather than pulling in a
 * head-management library for a handful of tags.
 */
export default function SEO({ title, description }) {
  useEffect(() => {
    const fullTitle = title && title !== SITE_NAME ? `${title} | ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;

    if (description) {
      setMetaTag("name", "description", description);
      setMetaTag("property", "og:description", description);
    }
    setMetaTag("property", "og:title", fullTitle);
  }, [title, description]);

  return null;
}
