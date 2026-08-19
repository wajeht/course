import { shallowRef } from "vue";

interface SectionIdentity {
  id: string | null;
}

export function useExpandableSections(panelPrefix: string) {
  const expandedSectionKeys = shallowRef<Set<string>>(new Set());

  function sectionKey(section: SectionIdentity): string {
    return section.id ?? "direct";
  }

  function sectionPanelId(section: SectionIdentity): string {
    return `${panelPrefix}-${sectionKey(section)}`;
  }

  function isSectionExpanded(section: SectionIdentity): boolean {
    return expandedSectionKeys.value.has(sectionKey(section));
  }

  function toggleSection(section: SectionIdentity): void {
    const key = sectionKey(section);
    const expandedKeys = new Set(expandedSectionKeys.value);
    if (expandedKeys.has(key)) expandedKeys.delete(key);
    else expandedKeys.add(key);
    expandedSectionKeys.value = expandedKeys;
  }

  function expandSection(section: SectionIdentity): void {
    expandedSectionKeys.value = new Set([...expandedSectionKeys.value, sectionKey(section)]);
  }

  function replaceExpandedSections(sections: SectionIdentity[]): void {
    expandedSectionKeys.value = new Set(sections.map(sectionKey));
  }

  return {
    expandSection,
    isSectionExpanded,
    replaceExpandedSections,
    sectionPanelId,
    toggleSection,
  };
}
