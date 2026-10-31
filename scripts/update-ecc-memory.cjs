const fs = require('fs');
const path = 'packages/agents/tools/eccMemoryEngine.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. EntityProfile
const targetProfile = '  targetPropertyType?: string;\r\n  historicalPrices?: Array<{ price: number; timestamp: string; source: string }>;';
const repProfile = '  targetCompounds?: string[];\r\n  targetPropertyType?: string;\r\n  bedrooms?: number;\r\n  urgency?: string;\r\n  preferencesHistory?: Array<{ timestamp: string; update: Record<string, any> }>;\r\n  historicalPrices?: Array<{ price: number; timestamp: string; source: string }>;';
if (content.includes(targetProfile)) {
  content = content.replace(targetProfile, repProfile);
  console.log('1. Replaced EntityProfile');
}

// 2. trackBuyerPreferences
const targetLeadScoring = '    return episode;\r\n  }\r\n\r\n  // --- 3. Semantic Entity Graph ---';
const repBuyerPref = [
  '    return episode;',
  '  }',
  '',
  '  public trackBuyerPreferences(',
  '    buyerId: string,',
  '    prefs: {',
  '      budgetMin?: number;',
  '      budgetMax?: number;',
  '      targetCompound?: string;',
  '      targetCompounds?: string[];',
  '      targetType?: string;',
  '      bedrooms?: number;',
  '      urgency?: string;',
  '      notes?: string;',
  '    },',
  "    actor = 'Sierra Intent Learner'",
  '  ): { episode: Episode; entity: EntityProfile } {',
  '    const summaryParts: string[] = [];',
  '    if (prefs.targetCompound) summaryParts.push(`Compound: ${prefs.targetCompound}`);',
  '    if (prefs.targetCompounds && prefs.targetCompounds.length > 0) {',
  '      summaryParts.push(`Compounds: ${prefs.targetCompounds.join(", ")}`);',
  '    }',
  '    if (prefs.budgetMax) summaryParts.push(`Max Budget: ${prefs.budgetMax.toLocaleString()} EGP`);',
  '    if (prefs.targetType) summaryParts.push(`Type: ${prefs.targetType}`);',
  '    if (prefs.bedrooms) summaryParts.push(`Beds: ${prefs.bedrooms}`);',
  '    if (prefs.urgency) summaryParts.push(`Urgency: ${prefs.urgency}`);',
  '',
  '    const episode = this.recordEpisode({',
  "      type: 'buyer_preference',",
  '      entityId: buyerId,',
  '      actor,',
  '      summary: `Updated buyer preferences: ${summaryParts.join(" | ") || "Profile updated"}`,',
  '      data: {',
  '        entityId: buyerId,',
  '        ...prefs,',
  '      },',
  '    });',
  '',
  '    const entity = this.getEntity(buyerId)!;',
  '    return { episode, entity };',
  '  }',
  '',
  '  // --- 3. Semantic Entity Graph ---'
].join('\r\n');

if (content.includes(targetLeadScoring)) {
  content = content.replace(targetLeadScoring, repBuyerPref);
  console.log('2. Replaced trackBuyerPreferences');
}

// 3. updateEntityFromEpisode buyer_preference
const targetUpdatePref = [
  "    if (episode.type === 'buyer_preference' && episode.data?.budgetMax) {",
  "      entity.type = 'buyer';",
  '      entity.budgetRange = { min: episode.data.budgetMin || 0, max: episode.data.budgetMax };',
  '      entity.compound = episode.data.targetCompound;',
  '      entity.targetPropertyType = episode.data.targetType;',
  '    }'
].join('\r\n');

const repUpdatePref = [
  "    if (episode.type === 'buyer_preference') {",
  "      entity.type = 'buyer';",
  '      if (episode.data?.budgetMax) {',
  '        entity.budgetRange = {',
  '          min: episode.data.budgetMin || entity.budgetRange?.min || 0,',
  '          max: episode.data.budgetMax,',
  '        };',
  '      }',
  '      if (episode.data?.targetCompound) {',
  '        entity.compound = episode.data.targetCompound;',
  '        entity.targetCompounds = Array.from(',
  '          new Set([...(entity.targetCompounds || []), episode.data.targetCompound])',
  '        );',
  '      }',
  '      if (Array.isArray(episode.data?.targetCompounds)) {',
  '        entity.targetCompounds = Array.from(',
  '          new Set([...(entity.targetCompounds || []), ...episode.data.targetCompounds])',
  '        );',
  '      }',
  '      if (episode.data?.targetType) {',
  '        entity.targetPropertyType = episode.data.targetType;',
  '      }',
  '      if (episode.data?.bedrooms) {',
  '        entity.bedrooms = episode.data.bedrooms;',
  '      }',
  '      if (episode.data?.urgency) {',
  '        entity.urgency = episode.data.urgency;',
  '        entity.tags = Array.from(new Set([...entity.tags, `URGENCY_${String(episode.data.urgency).toUpperCase()}`]));',
  '      }',
  '      entity.preferencesHistory = [',
  '        ...(entity.preferencesHistory || []),',
  '        { timestamp: episode.timestamp, update: episode.data },',
  '      ];',
  '    }'
].join('\r\n');

if (content.includes(targetUpdatePref)) {
  content = content.replace(targetUpdatePref, repUpdatePref);
  console.log('3. Replaced updateEntityFromEpisode');
}

// 4. findMatchingBuyers
const targetFindMatches = [
  '  public findMatchingBuyers(property: {',
  '    compound: string;',
  '    propertyType: string;',
  '    price: number;',
  '  }): EntityProfile[] {',
  '    const matches: EntityProfile[] = [];',
  '',
  '    for (const entity of this.entityGraph.values()) {',
  "      if (entity.type === 'buyer') {",
  '        const matchesCompound = !entity.compound || entity.compound.toLowerCase().includes(property.compound.toLowerCase());',
  '        const matchesType = !entity.targetPropertyType || entity.targetPropertyType.toLowerCase().includes(property.propertyType.toLowerCase());',
  '        const matchesBudget = !entity.budgetRange || property.price <= entity.budgetRange.max * 1.1;',
  '',
  '        if (matchesCompound && matchesType && matchesBudget) {',
  '          matches.push(entity);',
  '        }',
  '      }',
  '    }',
  '',
  '    return matches;',
  '  }'
].join('\r\n');

const repFindMatches = [
  '  public findMatchingBuyers(property: {',
  '    compound: string;',
  '    propertyType: string;',
  '    price: number;',
  '    bedrooms?: number;',
  '  }): EntityProfile[] {',
  '    const matches: EntityProfile[] = [];',
  '',
  '    for (const entity of this.entityGraph.values()) {',
  "      if (entity.type === 'buyer') {",
  '        const matchesCompound =',
  '          !entity.compound && (!entity.targetCompounds || entity.targetCompounds.length === 0)',
  '            ? true',
  '            : (entity.compound && property.compound.toLowerCase().includes(entity.compound.toLowerCase())) ||',
  '              (entity.targetCompounds || []).some((c) => property.compound.toLowerCase().includes(c.toLowerCase()));',
  '',
  '        const matchesType =',
  '          !entity.targetPropertyType ||',
  '          entity.targetPropertyType.toLowerCase().includes(property.propertyType.toLowerCase()) ||',
  '          property.propertyType.toLowerCase().includes(entity.targetPropertyType.toLowerCase());',
  '',
  '        const matchesBudget =',
  '          !entity.budgetRange || property.price <= entity.budgetRange.max * 1.1;',
  '',
  '        const matchesBedrooms =',
  '          !entity.bedrooms || !property.bedrooms || property.bedrooms >= entity.bedrooms;',
  '',
  '        if (matchesCompound && matchesType && matchesBudget && matchesBedrooms) {',
  '          matches.push(entity);',
  '        }',
  '      }',
  '    }',
  '',
  '    return matches;',
  '  }'
].join('\r\n');

if (content.includes(targetFindMatches)) {
  content = content.replace(targetFindMatches, repFindMatches);
  console.log('4. Replaced findMatchingBuyers');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Saved eccMemoryEngine.ts');
