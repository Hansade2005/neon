# The cast: 12 civilians (6 men, 6 women) with different faces, ages, builds, hair and outfits.
R = lambda c, a, s: dict(caucasian=c, african=a, asian=s)
CAST = {
 'm1': dict(name='Marcus Okoye', gender=1.0, height=1.84, muscle=0.7, weight=0.5, age=0.5, race=R(.04, .93, .03), skin='young_african_male', hair='short04', hair_color=(.03, .025, .02), eyebrows='eyebrow002', eyes='brown', outfit='male_casualsuit03', shoes='shoes04'),
 'm2': dict(name='Kenji Arakawa', gender=1.0, height=1.76, muscle=0.55, weight=0.42, age=0.5, race=R(.2, .03, .77), skin='young_asian_male', hair='short01', hair_color=(.035, .03, .025), eyebrows='eyebrow007', eyes='brown', outfit='male_casualsuit01', shoes='shoes02'),
 'm3': dict(name='Dante Moreau', gender=1.0, height=1.80, muscle=0.6, weight=0.5, age=0.5, race=R(.85, .05, .10), skin='young_caucasian_male', hair='short02', hair_color=(.2, .13, .07), eyebrows='eyebrow005', eyes='blue', outfit='male_casualsuit05', shoes='shoes05'),
 'm4': dict(name='Rafael Duarte', gender=1.0, height=1.78, muscle=0.62, weight=0.52, age=0.5, race=R(.55, .15, .30), skin='young_caucasian_male2', hair='short03', hair_color=(.05, .04, .03), eyebrows='eyebrow003', eyes='brownlight', outfit='male_casualsuit02', shoes='shoes03'),
 'm5': dict(name='Idris Mbaye', gender=1.0, height=1.86, muscle=0.75, weight=0.6, age=0.62, race=R(.04, .93, .03), skin='middleage_african_male', hair='short04', hair_color=(.1, .1, .1), eyebrows='eyebrow001', eyes='brown', outfit='male_worksuit01', shoes='shoes06', skin_gain=0.92),
 'm6': dict(name='Viktor Lind', gender=1.0, height=1.82, muscle=0.5, weight=0.5, age=0.65, race=R(.9, .03, .07), skin='middleage_caucasian_male', hair='short02', hair_color=(.45, .43, .4), eyebrows='eyebrow004', eyes='grey', outfit='male_elegantsuit01', shoes='shoes01'),
 'f1': dict(name='Elena Varga', gender=0.0, height=1.70, muscle=0.35, weight=0.42, age=0.5, race=R(.9, .03, .07), skin='young_caucasian_female', hair='long01', hair_color=(.12, .07, .04), eyebrows='eyebrow008', eyes='green', outfit='female_casualsuit01', shoes='shoes02'),
 'f2': dict(name='Aiko Tanaka', gender=0.0, height=1.64, muscle=0.3, weight=0.38, age=0.5, race=R(.1, .02, .88), skin='young_asian_female', hair='bob01', hair_color=(.03, .03, .035), eyebrows='eyebrow009', eyes='brown', outfit='female_casualsuit02', shoes='shoes05'),
 'f3': dict(name='Amara Nwosu', gender=0.0, height=1.72, muscle=0.4, weight=0.45, age=0.5, race=R(.04, .93, .03), skin='young_african_female', hair='braid01', hair_color=(.03, .025, .02), eyebrows='eyebrow010', eyes='brown', outfit='female_casualsuit01', shoes='shoes04', tint=0.8),
 'f4': dict(name='Sofia Ricci', gender=0.0, height=1.68, muscle=0.35, weight=0.46, age=0.5, race=R(.55, .15, .30), skin='young_caucasian_female2', hair='ponytail01', hair_color=(.2, .1, .05), eyebrows='eyebrow011', eyes='brownlight', outfit='female_casualsuit02', shoes='shoes03', tint=1.1),
 'f5': dict(name='Mei Chen', gender=0.0, height=1.66, muscle=0.3, weight=0.4, age=0.62, race=R(.1, .02, .88), skin='middleage_asian_female', hair='bob02', hair_color=(.06, .06, .06), eyebrows='eyebrow012', eyes='brown', outfit='female_elegantsuit01', shoes='shoes01'),
 'f6': dict(name='Grace Adeyemi', gender=0.0, height=1.73, muscle=0.4, weight=0.52, age=0.65, race=R(.04, .93, .03), skin='middleage_african_female', hair='bob01', hair_color=(.2, .2, .2), eyebrows='eyebrow008', eyes='brown', outfit='female_elegantsuit01', shoes='shoes06', skin_gain=0.95),
}

# staff roles (uniforms are the suit textures recoloured to one colour)
CAST.update({
 'cop_m': dict(name='Officer Reyes', gender=1.0, height=1.83, muscle=0.7, weight=0.5, age=0.5, race=R(.55, .15, .30), skin='young_caucasian_male2', hair='short02', hair_color=(.05, .04, .03), eyebrows='eyebrow003', eyes='brown', outfit='male_elegantsuit01', outfit_color=(0.05, 0.09, 0.25), shoes='shoes01', hat='fedora01', hat_color=(0.04, 0.07, 0.2)),
 'cop_f': dict(name='Officer Walker', gender=0.0, height=1.72, muscle=0.45, weight=0.45, age=0.5, race=R(.04, .93, .03), skin='young_african_female', hair='ponytail01', hair_color=(.03, .025, .02), eyebrows='eyebrow010', eyes='brown', outfit='female_elegantsuit01', outfit_color=(0.05, 0.09, 0.25), shoes='shoes01'),
 'doc_m': dict(name='Dr. Tanaka', gender=1.0, height=1.78, muscle=0.4, weight=0.42, age=0.6, race=R(.2, .03, .77), skin='middleage_asian_male', hair='short01', hair_color=(.1, .1, .1), eyebrows='eyebrow007', eyes='brown', outfit='male_elegantsuit01', outfit_color=(0.95, 0.96, 0.98), shoes='shoes06'),
 'doc_f': dict(name='Dr. Moreau', gender=0.0, height=1.68, muscle=0.35, weight=0.42, age=0.55, race=R(.9, .03, .07), skin='young_caucasian_female2', hair='bob02', hair_color=(.25, .12, .06), eyebrows='eyebrow011', eyes='green', outfit='female_elegantsuit01', outfit_color=(0.95, 0.96, 0.98), shoes='shoes06'),
 'medic_m': dict(name='Paramedic Mbaye', gender=1.0, height=1.84, muscle=0.7, weight=0.55, age=0.55, race=R(.04, .93, .03), skin='middleage_african_male', hair='short04', hair_color=(.05, .05, .05), eyebrows='eyebrow001', eyes='brown', outfit='male_worksuit01', outfit_color=(0.1, 0.6, 0.3), shoes='shoes06'),
})

# story family (children are non-combat NPCs)
CAST.update({
 'k_zoe': dict(name='Zoe', gender=0.0, height=1.32, muscle=0.2, weight=0.4, age=0.12, proportions=0.5, race=R(.1, .85, .05), skin='young_african_female', hair='braid01', hair_color=(.03, .025, .02), eyebrows='eyebrow010', eyes='brown', outfit='female_casualsuit02', shoes='shoes05', body_tris=7000),
 'k_leo': dict(name='Leo', gender=1.0, height=1.12, muscle=0.2, weight=0.4, age=0.08, proportions=0.5, race=R(.4, .5, .1), skin='young_african_male', hair='short03', hair_color=(.04, .03, .03), eyebrows='eyebrow002', eyes='brown', outfit='male_casualsuit05', shoes='shoes03', body_tris=7000),
})

# story villains and allies
CAST.update({
 'ghost': dict(name='Dante Ghost Kane', gender=1.0, height=1.86, muscle=0.45, weight=0.45, age=0.6, race=R(.9, .03, .07), skin='middleage_caucasian_male', hair='short03', hair_color=(.55, .55, .58), eyebrows='eyebrow004', eyes='grey', outfit='male_elegantsuit01', outfit_color=(0.025, 0.025, 0.035), shoes='shoes01', skin_gain=1.05),
 'thug_a': dict(name='Goon', gender=1.0, height=1.88, muscle=0.85, weight=0.6, age=0.5, race=R(.7, .1, .2), skin='young_caucasian_male', hair='short04', hair_color=(.04, .04, .04), eyebrows='eyebrow001', eyes='brown', outfit='male_worksuit01', outfit_color=(0.04, 0.045, 0.05), shoes='shoes06', body_tris=8000),
 'thug_b': dict(name='Goon', gender=1.0, height=1.82, muscle=0.8, weight=0.55, age=0.5, race=R(.3, .6, .1), skin='young_african_male', hair='short01', hair_color=(.03, .03, .03), eyebrows='eyebrow002', eyes='brown', outfit='male_casualsuit03', outfit_color=(0.06, 0.06, 0.07), shoes='shoes06', body_tris=8000),
 'lena': dict(name='Agent Ortiz', gender=0.0, height=1.70, muscle=0.5, weight=0.42, age=0.5, race=R(.55, .15, .30), skin='young_caucasian_female2', hair='ponytail01', hair_color=(.1, .06, .04), eyebrows='eyebrow011', eyes='brownlight', outfit='female_elegantsuit01', outfit_color=(0.08, 0.1, 0.16), shoes='shoes01'),
 'rex': dict(name='Rex Holloway', gender=1.0, height=1.90, muscle=0.8, weight=0.58, age=0.6, race=R(.04, .93, .03), skin='middleage_african_male', hair='short04', hair_color=(.08, .08, .08), eyebrows='eyebrow001', eyes='brown', outfit='male_worksuit01', outfit_color=(0.09, 0.1, 0.12), shoes='shoes06'),
})
