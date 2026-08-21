import { describe, expect, it } from "vitest";

import { useExpandableSections } from "./useExpandableSections.js";

describe("useExpandableSections", () => {
  it("toggles a section", () => {
    const sections = useExpandableSections("playlist-section");
    const section = { id: "volume-1" };

    sections.toggleSection(section);

    expect(sections.isSectionExpanded(section)).toBe(true);
    sections.toggleSection(section);
    expect(sections.isSectionExpanded(section)).toBe(false);
  });

  it("replaces or extends the expanded sections", () => {
    const sections = useExpandableSections("playlist-section");
    const first = { id: "volume-1" };
    const second = { id: "volume-2" };

    sections.replaceExpandedSections([first]);
    sections.expandSection(second);

    expect(sections.isSectionExpanded(first)).toBe(true);
    expect(sections.isSectionExpanded(second)).toBe(true);

    sections.replaceExpandedSections([second]);
    expect(sections.isSectionExpanded(first)).toBe(false);
    expect(sections.isSectionExpanded(second)).toBe(true);
  });

  it("creates stable panel ids for named and direct sections", () => {
    const sections = useExpandableSections("sidebar-section");

    expect(sections.sectionPanelId({ id: "volume-1" })).toBe("sidebar-section-volume-1");
    expect(sections.sectionPanelId({ id: null })).toBe("sidebar-section-direct");
  });
});
