-- For the PDF version only: Days 8-12 use "# Part N: ..." headings at the
-- same level as the day's title, which would make every part a chapter.
-- Demote each "# Part ..." heading, and the headings beneath it, by one
-- level, until the next ordinary level-1 heading (the next chapter).
function Pandoc(doc)
  local in_part = false
  doc.blocks = doc.blocks:walk({
    Header = function(h)
      if h.level == 1 then
        in_part = pandoc.utils.stringify(h.content):match("^Part%s") ~= nil
        if in_part then h.level = 2 end
      elseif in_part then
        h.level = h.level + 1
      end
      return h
    end
  })
  return doc
end

-- Raw HTML is dropped in the PDF. Replace the interactive quizzes with a
-- pointer to the website, and embedded YouTube videos with a link.
function RawBlock(el)
  if el.format ~= "html" then return nil end
  local id = el.text:match("youtube%.com/embed/([%w_%-]+)")
  if id then
    local url = "https://www.youtube.com/watch?v=" .. id
    local title = el.text:match('title="([^"]*)"') or "Video"
    return pandoc.Para({pandoc.Str("Video: "), pandoc.Link(title, url)})
  end
  if el.text:match("renderQuiz") then
    return pandoc.Para({pandoc.Emph({pandoc.Str("The interactive quiz for this section is in the online version: "),
      pandoc.Link("course.bioinfo.se", "https://course.bioinfo.se/")})})
  end
  return nil
end
