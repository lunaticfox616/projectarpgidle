# MOD_DB 태그와 종류 제안 (2026-10-07, 드랍 풀 2단계 검토)

태그 24종: 피해(damage), 공격(attack), 주문(spell), 소환(minion), 물리(physical), 원소(elemental), 화염(fire), 냉기(cold), 번개(lightning), 카오스(chaos), 치명(critical), 속도(speed), 지속(dot), 투사체(projectile), 근접(melee), 범위(area), 타겟(target), 생명(life), 방어(defence), 저항(resistance), 회복(recovery), 관통(penetration), 능력치(attribute), 젬(gem)

종류 열: 지금 → 제안(A2). 굵게 표시한 줄이 바뀐다. 태그는 능력치에 붙고 복합 줄은 두 능력치 태그의 합이다.

| 줄 | 능력치 | 이름 | 부위 | 가중치 | 종류 | 태그 |
|---|---|---|---|---|---|---|
| flatDmg (:1515) | flatDmg | 기본 피해 | 무기 | 1 | 접두 | 피해, 공격, 물리 |
| weaponFlatDmgPct (:1516) | weaponFlatDmgPct | 무기의 기본 피해 증가(%) | 무기 | 1 | 접두 | 피해, 공격, 물리 |
| pctDmg (:1517) | pctDmg | 피해 증가(%) | 무기, 반지, 목걸이 | 1 | 접두 | 피해 |
| meleePctDmg (:1518) | meleePctDmg | 근접 피해(%) | 무기, 장갑, 목걸이, 허리띠 | 1 | 접두 | 피해, 공격, 근접 |
| projectilePctDmg (:1519) | projectilePctDmg | 투사체 피해(%) | 무기, 반지, 장갑, 목걸이 | 1 | 접두 | 피해, 투사체 |
| physPctDmg (:1520) | physPctDmg | 물리 피해(%) | 무기, 허리띠, 반지, 방패 | 1 | 접두 | 피해, 물리 |
| elementalPctDmg (:1521) | elementalPctDmg | 원소 피해(%) | 무기, 반지, 목걸이 | 1 | 접두 | 피해, 원소 |
| firePctDmg (:1522) | firePctDmg | 화염 피해(%) | 무기, 반지, 목걸이, 방패 | 1 | 접두 | 피해, 원소, 화염 |
| coldPctDmg (:1523) | coldPctDmg | 냉기 피해(%) | 무기, 반지, 목걸이, 방패 | 1 | 접두 | 피해, 원소, 냉기 |
| lightPctDmg (:1524) | lightPctDmg | 번개 피해(%) | 무기, 반지, 목걸이, 방패 | 1 | 접두 | 피해, 원소, 번개 |
| chaosPctDmg (:1525) | chaosPctDmg | 카오스 피해(%) | 무기, 반지, 목걸이, 장갑, 방패 | 1 | 접두 | 피해, 카오스 |
| aoePctDmg (:1526) | aoePctDmg | 범위 피해(%) | 무기, 투구, 목걸이, 갑옷 | 1 | 접두 | 피해, 범위 |
| dotPctDmg (:1527) | dotPctDmg | 지속 피해 배율(%) | 무기, 반지, 목걸이 | 1 | 접두 | 피해, 지속 |
| summonFlatDmg (:1528) | summonFlatDmg | 소환수 기본 피해 | 무기 | 1 | 접두 | 피해, 소환 |
| summonPctDmg (:1529) | summonPctDmg | 소환수 피해(%) | 무기, 반지 | 1 | 접두 | 피해, 소환 |
| summonHpPct (:1530) | summonHpPct | 소환수 생명력(%) | 무기, 반지 | 1 | 접두 | 소환, 생명 |
| summonAspd (:1531) | summonAspd | 소환수 공격 속도(%) | 무기 | 1 | 접미 | 공격, 소환, 속도 |
| summonCrit (:1532) | summonCrit | 소환수 치명타 확률(%) | 무기, 반지 | 1 | 접미 | 소환, 치명 |
| summonCritDmg (:1533) | summonCritDmg | 소환수 치명타 피해 배율(%) | 무기, 반지 | 1 | 접미 | 피해, 소환, 치명 |
| summonEfficiency (:1534) | summonEfficiency | 소환수 효율(%) | 무기, 반지 | 1 | 접미 | 소환 |
| summonCap (:1535) | summonCap | 소환수 최대 한도 | 반지 | 0.35 | **특수 → 접미** | 소환 |
| summonResPen (:1536) | summonResPen | 소환수 저항 관통(%) | 무기 | 0.7 | 접미 | 소환, 원소, 관통 |
| summonWeaponGemLevel (:1537) | summonGemLevel | 소환수 공격 스킬 젬 레벨 | 무기 | 0.15 | **특수 → 접두** | 소환, 젬 |
| summonRingGemLevel (:1538) | summonGemLevel | 소환수 공격 스킬 젬 레벨 | 반지 | 0.15 | **특수 → 접두** | 소환, 젬 |
| spellFlatDmg (:1539) | spellFlatDmg | 주문 내장 피해 | 무기, 목걸이 | 1 | 접두 | 피해, 주문 |
| spellFlatPct (:1540) | spellFlatPct | 주문 내장 피해 증가(%) | 무기, 목걸이, 방패 | 1 | **접미 → 접두** | 피해, 주문 |
| flatHp (:1541) | flatHp | 최대 생명력 | 무기, 투구, 갑옷, 장갑, 신발, 목걸이, 반지, 허리띠, 방패 | 1 | 접두 | 생명 |
| strength (:1542) | strength | 힘 | 무기, 투구, 갑옷, 장갑, 신발, 목걸이, 반지, 허리띠, 방패 | 1 | 접미 | 능력치 |
| dexterity (:1543) | dexterity | 민첩 | 무기, 투구, 갑옷, 장갑, 신발, 목걸이, 반지, 허리띠, 방패 | 1 | 접미 | 능력치 |
| intelligence (:1544) | intelligence | 지능 | 무기, 투구, 갑옷, 장갑, 신발, 목걸이, 반지, 허리띠, 방패 | 1 | 접미 | 능력치 |
| accuracy (:1545) | accuracy | 정확도 | 무기, 장갑, 반지, 목걸이 | 1 | 접미 | 공격 |
| armor (:1546) | armor | 방어도 | 투구, 갑옷, 장갑, 신발, 목걸이, 반지, 허리띠, 방패 | 1 | 접두 | 방어 |
| evasion (:1547) | evasion | 회피 | 투구, 갑옷, 장갑, 신발, 목걸이, 반지, 허리띠, 방패 | 1 | 접두 | 방어 |
| energyShield (:1548) | energyShield | 에너지 보호막 | 투구, 갑옷, 장갑, 신발, 방패 | 1 | 접두 | 방어 |
| armorPct (:1549) | armorPct | 방어도 증가(%) | 투구, 갑옷, 장갑, 신발, 방패 | 1 | 접미 | 방어 |
| evasionPct (:1550) | evasionPct | 회피 증가(%) | 투구, 갑옷, 장갑, 신발, 방패 | 1 | 접미 | 방어 |
| deflectChance (:1551) | deflectChance | 비껴내기 확률(%) | 투구, 갑옷, 장갑, 신발, 방패 | 1 | 접미 | 방어 |
| energyShieldPct (:1552) | energyShieldPct | 에너지 보호막 증가(%) | 투구, 갑옷, 장갑, 신발, 방패 | 1 | 접미 | 방어 |
| pctHp (:1553) | pctHp | 생명력 증가(%) | 갑옷, 허리띠 | 1 | 접미 | 생명 |
| aspd (:1554) | aspd | 공격 속도(%) | 무기, 반지, 목걸이, 허리띠, 장갑 | 1 | 접미 | 공격, 속도 |
| crit (:1555) | crit | 치명타 확률(%) | 무기, 투구, 갑옷, 장갑, 신발, 목걸이, 반지, 허리띠 | 1 | 접미 | 치명 |
| move (:1556) | move | 이동 속도(%) | 신발 | 1 | **접미 → 접두** | 속도 |
| gemLevel (:1557) | gemLevel | 모든 스킬 젬 레벨 | 목걸이 | 1 | **특수 → 접두** | 젬 |
| physIgnore (:1558) | physIgnore | 물리 피해 감소 무시(%) | 무기, 장갑, 목걸이 | 1 | 접미 | 물리, 관통 |
| resF (:1559) | resF | 화염 저항(%) | 반지, 목걸이, 갑옷, 투구, 신발, 장갑, 허리띠, 방패 | 1 | 접미 | 원소, 화염, 저항 |
| resC (:1560) | resC | 냉기 저항(%) | 반지, 목걸이, 갑옷, 투구, 신발, 장갑, 허리띠, 방패 | 1 | 접미 | 원소, 냉기, 저항 |
| resL (:1561) | resL | 번개 저항(%) | 반지, 목걸이, 갑옷, 투구, 신발, 장갑, 허리띠, 방패 | 1 | 접미 | 원소, 번개, 저항 |
| resAll (:1562) | resAll | 모든 원소 저항(%) | 반지, 목걸이, 갑옷, 방패 | 1 | 접미 | 원소, 저항 |
| resChaos (:1563) | resChaos | 카오스 저항(%) | 반지, 방패 | 1 | 접미 | 카오스, 저항 |
| resPen (:1564) | resPen | 저항 관통(%) | 무기, 반지, 목걸이 | 1 | 접미 | 원소, 관통 |
| regen (:1565) | regen | 초당 재생(%) | 갑옷, 허리띠, 목걸이, 방패 | 1 | 접미 | 생명, 회복 |
| regenFlat (:1566) | regenFlat | 생명력 재생(고정) | 갑옷, 목걸이, 반지, 허리띠, 방패 | 1 | 접미 | 생명, 회복 |
| regenSuppress (:1567) | regenSuppress | 재생 억제(%) | 허리띠 | 1 | 접미 | 지속 |
| regenSuppressGloves (:1568) | regenSuppress | 재생 억제(%) | 장갑 | 1 | 접미 | 지속 |
| regenSuppressAmulet (:1569) | regenSuppress | 재생 억제(%) | 목걸이 | 1 | 접미 | 지속 |
| targetAny (:1570) | targetAny | 스킬 타겟 수 | 장갑 | 0.45 | **특수 → 접미** | 타겟 |
| targetProjectile (:1571) | targetProjectile | 투사체 스킬 타겟 수 | 무기 | 0.45 | **특수 → 접미** | 투사체, 타겟 |
| projectileExtraShots (:1572) | projectileExtraChance | 투사체 추가 발사 확률(%) | 무기 | 0.4 | **특수 → 접미** | 투사체, 타겟 |
| targetSlam (:1573) | targetSlam | 강타 스킬 타겟 수 | 무기 | 0.45 | **특수 → 접미** | 근접, 범위, 타겟 |
| leech (:1574) | leech | 공격 피해의 생명력 흡수(%) | 무기, 장갑, 반지 | 1 | 접미 | 공격, 생명, 회복 |
| leechRateCap (:1575) | leechRateCap | 흡혈 회복 속도 캡(%) | 무기, 장갑, 목걸이 | 1 | 접미 | 생명, 회복 |
| leechTotalCap (:1576) | leechTotalCap | 흡혈 총 회복량 캡(%) | 갑옷, 허리띠, 목걸이 | 1 | 접미 | 생명, 회복 |
| leechInstanceCap (:1577) | leechInstanceCap | 흡혈 타격당 회복량 캡(%) | 무기, 반지, 장갑 | 1 | 접미 | 생명, 회복 |
| dr (:1578) | dr | 물리 피해 감소(%) | 갑옷, 허리띠, 투구 | 1 | 접미 | 물리, 방어 |
| critDmg (:1579) | critDmg | 치명타 피해 배율(%) | 무기, 목걸이, 투구 | 1 | 접미 | 피해, 치명 |
| ds (:1580) | ds | 연속 타격(%) | 장갑, 무기 | 1 | 접미 | 공격, 속도 |
| minDmgRollWeapon (:1581) | minDmgRoll | 최소 피해 보정(%) | 무기 | 1 | 접미 | 피해 |
| maxDmgRollWeapon (:1582) | maxDmgRoll | 최대 피해 보정(%) | 무기 | 1 | 접미 | 피해 |
| suppCap (:1583) | suppCap | 보조 스킬 젬 한도 | 목걸이 | 1 | **특수 → 접두** | 젬 |
| shieldBlockPct (:1584) | blockChancePct | 막기 확률(%) 증가 | 방패 | 1 | 접미 | 방어 |
| shieldBlockFlat (:1585) | blockChance | 막기 확률(+%p) | 방패 | 1 | 접미 | 방어 |
| shieldMaxResF (:1586) | maxResF | 최대 화염 저항(%) | 방패 | 0.35 | **특수 → 접미** | 원소, 화염, 저항 |
| shieldMaxResC (:1587) | maxResC | 최대 냉기 저항(%) | 방패 | 0.35 | **특수 → 접미** | 원소, 냉기, 저항 |
| shieldMaxResL (:1588) | maxResL | 최대 번개 저항(%) | 방패 | 0.35 | **특수 → 접미** | 원소, 번개, 저항 |
| shieldMaxResChaos (:1589) | maxResChaos | 최대 카오스 저항(%) | 방패 | 0.25 | **특수 → 접미** | 카오스, 저항 |
| shieldMaxResAll (:1590) | maxResAll | 모든 원소 최대 저항(%) | 방패 | 0.15 | **특수 → 접미** | 원소, 저항 |
| shieldSpellGemLevel (:1591) | spellGemLevel | 모든 주문 스킬 젬 레벨 | 방패 | 0.3 | **특수 → 접두** | 주문, 젬 |
| weaponPhysFlatDmg (:1592) | physFlatDmg | 물리 기본 피해 | 무기 | 1 | 접두 | 피해, 물리 |
| weaponFireFlatDmg (:1593) | fireFlatDmg | 화염 기본 피해 | 무기 | 1 | 접두 | 피해, 원소, 화염 |
| weaponColdFlatDmg (:1594) | coldFlatDmg | 냉기 기본 피해 | 무기 | 1 | 접두 | 피해, 원소, 냉기 |
| weaponLightFlatDmg (:1595) | lightFlatDmg | 번개 기본 피해 | 무기 | 1 | 접두 | 피해, 원소, 번개 |
| weaponChaosFlatDmg (:1596) | chaosFlatDmg | 카오스 기본 피해 | 무기 | 1 | 접두 | 피해, 카오스 |
| ringPhysFlatDmg (:1597) | physFlatDmg | 물리 기본 피해 | 반지 | 1 | 접두 | 피해, 물리 |
| ringFireFlatDmg (:1598) | fireFlatDmg | 화염 기본 피해 | 반지 | 1 | 접두 | 피해, 원소, 화염 |
| ringColdFlatDmg (:1599) | coldFlatDmg | 냉기 기본 피해 | 반지 | 1 | 접두 | 피해, 원소, 냉기 |
| ringLightFlatDmg (:1600) | lightFlatDmg | 번개 기본 피해 | 반지 | 1 | 접두 | 피해, 원소, 번개 |
| ringChaosFlatDmg (:1601) | chaosFlatDmg | 카오스 기본 피해 | 반지 | 1 | 접두 | 피해, 카오스 |
| glovePhysFlatDmg (:1602) | physFlatDmg | 물리 기본 피해 | 장갑 | 1 | 접두 | 피해, 물리 |
| gloveFireFlatDmg (:1603) | fireFlatDmg | 화염 기본 피해 | 장갑 | 1 | 접두 | 피해, 원소, 화염 |
| gloveColdFlatDmg (:1604) | coldFlatDmg | 냉기 기본 피해 | 장갑 | 1 | 접두 | 피해, 원소, 냉기 |
| gloveLightFlatDmg (:1605) | lightFlatDmg | 번개 기본 피해 | 장갑 | 1 | 접두 | 피해, 원소, 번개 |
| gloveChaosFlatDmg (:1606) | chaosFlatDmg | 카오스 기본 피해 | 장갑 | 1 | 접두 | 피해, 카오스 |
| compoundArmor (:1607) | armor | 방어도 + 방어도 증가(%) | 투구, 갑옷, 장갑, 신발, 방패 | 1 | 접두 | 방어 |
| compoundEvasion (:1608) | evasion | 회피 + 회피 증가(%) | 투구, 갑옷, 장갑, 신발, 방패 | 1 | 접두 | 방어 |
| compoundEnergyShield (:1609) | energyShield | 에너지 보호막 + 보호막 증가(%) | 투구, 갑옷, 장갑, 신발, 방패 | 1 | 접두 | 방어 |
| compoundWeaponDmg (:1610) | flatDmg | 기본 피해 + 무기의 기본 피해 증가(%) | 무기 | 1 | 접두 | 피해, 공격, 물리 |
| ringFlatDmg (:1611) | flatDmg | 기본 피해 | 반지 | 1 | 접두 | 피해, 공격, 물리 |
| gloveFlatDmg (:1612) | flatDmg | 기본 피해 | 장갑 | 1 | 접두 | 피해, 공격, 물리 |
| accessoryFlatDmg (:1613) | flatDmg | 기본 피해 | 목걸이, 허리띠 | 1 | 접두 | 피해, 공격, 물리 |
| attackPctDmg (:1614) | attackPctDmg | 공격 피해 증가(%) | 무기, 장갑, 목걸이 | 1 | 접두 | 피해, 공격 |
| spellPctDmg (:1615) | spellPctDmg | 주문 피해 증가(%) | 무기, 목걸이, 방패 | 1 | 접두 | 피해, 주문 |
| spellLeech (:1616) | spellLeech | 주문 피해의 생명력 흡수(%) | 무기, 목걸이, 방패 | 1 | 접미 | 주문, 생명, 회복 |
| greatswordSlamPctDmg (:1618) | slamPctDmg | 강타 피해(%) | 무기 [greatsword] | 1 | 접두 | 피해, 공격, 근접, 범위 |
| greatswordSlamGemLevel (:1619) | slamGemLevel | 강타 스킬 젬 레벨 | 무기 [greatsword] | 0.2 | **특수 → 접두** | 공격, 근접, 범위, 젬 |
| scimitarBleedChance (:1620) | bleedChance | 출혈 확률(%) | 무기 [scimitar] | 1 | 접미 | 공격, 물리, 지속 |
| scimitarMeleeGemLevel (:1621) | meleeGemLevel | 근접 스킬 젬 레벨 | 무기 [scimitar] | 0.2 | **특수 → 접두** | 공격, 근접, 젬 |
| shortbowProjectileGemLevel (:1622) | projectileGemLevel | 투사체 스킬 젬 레벨 | 무기 [shortbow] | 0.2 | **특수 → 접두** | 투사체, 젬 |
| shortbowAccuracyPct (:1623) | accuracyBonusPct | 정확도 보정(%) | 무기 [shortbow] | 1 | 접미 | 공격 |
| orbElementalGemLevel (:1624) | elementalGemLevel | 원소 스킬 젬 레벨 | 무기 [orb] | 0.15 | **특수 → 접두** | 원소, 젬 |
| orbSpellCritDmg (:1625) | spellCritDmg | 주문 치명타 피해 배율(%) | 무기 [orb] | 1 | 접미 | 피해, 주문, 치명 |
| flaskPotionPctDmg (:1626) | potionPctDmg | 포션 투척 피해(%) | 무기 [flask] | 1 | 접두 | 피해, 투사체 |
| flaskPoisonChance (:1627) | poisonChance | 중독 확률(%) | 무기 [flask] | 1 | 접미 | 카오스, 지속 |
| censerLightGemLevel (:1628) | lightGemLevel | 번개 스킬 젬 레벨 | 무기 [censer] | 0.2 | **특수 → 접두** | 원소, 번개, 젬 |
| censerRegen (:1629) | regen | 초당 재생(%) | 무기 [censer] | 1 | 접미 | 생명, 회복 |

태그별 줄 수: 피해 45, 원소 25, 공격 18, 물리 13, 방어 13, 소환 11, 생명 11, 젬 10, 저항 10, 회복 8, 번개 7, 카오스 7, 화염 6, 냉기 6, 지속 6, 주문 6, 근접 5, 투사체 5, 치명 5, 범위 4, 속도 4, 타겟 4, 관통 3, 능력치 3
