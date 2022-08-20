/**
 * strip XML prefix from string
 * @param {string} str
 */
export function stripPrefix(str) {
  const prefixMatch = new RegExp(/(?!xmlns)^.*:/);
  return str.replace(prefixMatch, "");
}

export function haltOnTimedout(err, req, res, next) {
  if (req.timedout === true) {
    if (res.headersSent) {
      next(err);
    } else {
      res.redirect("/timedout.html");
    }
  } else {
    next();
  }
}
