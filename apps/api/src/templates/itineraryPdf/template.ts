import type { TripResponse } from "../../repositories/tripRepository.js";

type PdfLine = {
  text: string;
  type?: "heading" | "muted" | "normal";
};

const pageWidth = 612;
const pageHeight = 792;
const marginX = 50;
const startY = 748;
const bottomY = 58;
const lineHeight = 16;
const maxLineLength = 92;

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTiming(activity: TripResponse["days"][number]["activities"][number]) {
  const { endTime, startTime, timeOfDay } = activity.timing;

  if (startTime && endTime) {
    return `${startTime}-${endTime}`;
  }

  if (startTime) {
    return startTime;
  }

  return timeOfDay ? titleCase(timeOfDay) : "Flexible";
}

function locationText(
  activity: TripResponse["days"][number]["activities"][number]
) {
  return [
    activity.location.name,
    activity.location.address,
    activity.location.city
  ]
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

function wrapText(text: string, maxLength = maxLineLength) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length === 0) {
      currentLine = word;
      continue;
    }

    if (`${currentLine} ${word}`.length > maxLength) {
      lines.push(currentLine);
      currentLine = word;
      continue;
    }

    currentLine = `${currentLine} ${word}`;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

function addWrappedLine(lines: PdfLine[], text: string, type?: PdfLine["type"]) {
  for (const [index, line] of wrapText(text).entries()) {
    lines.push({
      text: index === 0 ? line : `  ${line}`,
      ...(type !== undefined ? { type } : {})
    });
  }
}

export function buildItineraryPdfLines(
  trip: TripResponse,
  options: { exportedAt?: Date } = {}
): PdfLine[] {
  const exportedAt = options.exportedAt ?? new Date();
  const lines: PdfLine[] = [
    {
      text: trip.title,
      type: "heading"
    },
    {
      text: `${trip.startDate} to ${trip.endDate}`,
      type: "muted"
    },
    {
      text: `Cities: ${trip.cities.join(", ")}`
    },
    {
      text: `Pace: ${titleCase(trip.pace)} | Budget: ${titleCase(trip.budget)}`
    }
  ];

  if (trip.interests.length > 0) {
    addWrappedLine(lines, `Interests: ${trip.interests.join(", ")}`);
  }

  if (trip.constraints.length > 0) {
    addWrappedLine(lines, `Constraints: ${trip.constraints.join(", ")}`);
  }

  lines.push({ text: "" });

  const sortedDays = [...trip.days].sort((left, right) =>
    left.date.localeCompare(right.date)
  );

  sortedDays.forEach((day, dayIndex) => {
    lines.push({
      text: `Day ${dayIndex + 1}: ${day.city} (${day.date})`,
      type: "heading"
    });

    if (day.summary) {
      addWrappedLine(lines, `Summary: ${day.summary}`);
    }

    if (day.weatherSummary) {
      addWrappedLine(lines, `Weather: ${day.weatherSummary}`);
    }

    day.activities.forEach((activity, activityIndex) => {
      addWrappedLine(
        lines,
        `${activityIndex + 1}. ${activity.title}`,
        "heading"
      );
      addWrappedLine(lines, `Timing: ${formatTiming(activity)}`);
      addWrappedLine(lines, `Duration: ${activity.durationMinutes} minutes`);
      addWrappedLine(lines, `Location: ${locationText(activity)}`);
      addWrappedLine(lines, `Category: ${titleCase(activity.category)}`);
      addWrappedLine(lines, `Cost: ${titleCase(activity.costLevel)}`);
      addWrappedLine(lines, `Notes: ${activity.notes}`);

      if (activity.location.mapUrl) {
        addWrappedLine(lines, `Map: ${activity.location.mapUrl}`);
      }
    });

    lines.push({ text: "" });
  });

  lines.push({
    text: `Read-only export generated ${exportedAt.toISOString()}`,
    type: "muted"
  });

  return lines;
}

function toPdfSafeText(text: string) {
  return Array.from(text)
    .map((character) => {
      const code = character.charCodeAt(0);

      return code >= 32 && code <= 126 ? character : "?";
    })
    .join("")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function chunkLines(lines: PdfLine[]) {
  const pages: PdfLine[][] = [];
  let currentPage: PdfLine[] = [];
  let currentY = startY;

  for (const line of lines) {
    if (currentY < bottomY) {
      pages.push(currentPage);
      currentPage = [];
      currentY = startY;
    }

    currentPage.push(line);
    currentY -= lineHeight;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

function textCommand(line: PdfLine, y: number) {
  const fontSize = line.type === "heading" ? 13 : 10;
  const font = line.type === "heading" ? "F2" : "F1";
  const escapedText = toPdfSafeText(line.text);

  return `BT /${font} ${fontSize} Tf ${marginX} ${y} Td (${escapedText}) Tj ET`;
}

function buildContentStream(lines: PdfLine[]) {
  return lines
    .map((line, index) => textCommand(line, startY - index * lineHeight))
    .join("\n");
}

function pdfObject(id: number, body: string) {
  return `${id} 0 obj\n${body}\nendobj\n`;
}

export function renderItineraryPdf(lines: PdfLine[]): Buffer {
  const pages = chunkLines(lines);
  const objects: string[] = [];
  const catalogObjectId = 1;
  const pagesObjectId = 2;
  const fontObjectId = 3;
  const boldFontObjectId = 4;
  const firstPageObjectId = 5;
  const firstContentObjectId = firstPageObjectId + pages.length;
  const pageObjectIds = pages.map((_, index) => firstPageObjectId + index);
  const contentObjectIds = pages.map(
    (_, index) => firstContentObjectId + index
  );

  objects.push(pdfObject(catalogObjectId, "<< /Type /Catalog /Pages 2 0 R >>"));
  objects.push(
    pdfObject(
      pagesObjectId,
      `<< /Type /Pages /Kids [${pageObjectIds
        .map((id) => `${id} 0 R`)
        .join(" ")}] /Count ${pages.length} >>`
    )
  );
  objects.push(
    pdfObject(fontObjectId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
  );
  objects.push(
    pdfObject(
      boldFontObjectId,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
    )
  );

  pages.forEach((_, index) => {
    objects.push(
      pdfObject(
        pageObjectIds[index] ?? firstPageObjectId,
        `<< /Type /Page /Parent ${pagesObjectId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectId} 0 R /F2 ${boldFontObjectId} 0 R >> >> /Contents ${
          contentObjectIds[index] ?? firstContentObjectId
        } 0 R >>`
      )
    );
  });

  pages.forEach((pageLines, index) => {
    const stream = buildContentStream(pageLines);

    objects.push(
      pdfObject(
        contentObjectIds[index] ?? firstContentObjectId,
        `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`
      )
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${
    objects.length + 1
  } /Root ${catalogObjectId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "utf8");
}
