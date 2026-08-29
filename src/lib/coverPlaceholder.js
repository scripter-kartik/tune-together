



export function resolveCover(url) {
  if (!url || typeof url !== "string" || url === "/icon2.png") {
    
    return null;
  }
  return url;
}

export function coverError() {
  return (e) => {
    console.error("Cover image failed to load:", e.target.src);
    
    
    
  };
}
