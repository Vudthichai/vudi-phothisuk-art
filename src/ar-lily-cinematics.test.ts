import { expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Points, ShaderMaterial } from 'three';
import { createLilyCinematics, lilyCinematicTurn } from './ar/experimental/lilyCinematics';
import { SCULPTURE_TIMING } from './ar/experimental/sculptureTimeline';

it('eases out of the reveal and turns at the shared 11-second revolution rate', () => {
  const revealEnd = 3.95;
  const fullSpeed = revealEnd + .85;
  const revolution = SCULPTURE_TIMING.revolutionSeconds;
  expect(lilyCinematicTurn(revealEnd, revealEnd, false)).toBe(0);
  expect(lilyCinematicTurn(revealEnd + .001, revealEnd, false)).toBeCloseTo(0, 8);
  expect(lilyCinematicTurn(fullSpeed + revolution, revealEnd, false) - lilyCinematicTurn(fullSpeed, revealEnd, false))
    .toBeCloseTo(Math.PI * 2, 12);
  expect(lilyCinematicTurn(fullSpeed + revolution, revealEnd, true)).toBe(0);
});

it('keeps the bouquet offsets and restores its exact authored pose in reduced motion', () => {
  const upright = new Group(), turn = new Group();
  upright.add(turn);
  const pink = new Group(), orange = new Group();
  pink.rotation.x = -.26;
  orange.rotation.x = -.41;
  orange.position.set(-.27, .16, -.025);
  turn.add(pink, orange);
  const dance = createLilyCinematics('the-dance', turn, upright, {
    duration: 2, stagger: .65, softness: .22, atmosphere: .16, direction: [.1, .84, .06],
  });
  dance.update(.57, false);
  expect(pink.rotation.x).not.toBe(-.26);
  expect(orange.rotation.x).toBe(-.41);
  dance.update(4.5, false);
  expect(orange.rotation.x).not.toBe(-.41);
  expect(orange.position.toArray()).toEqual([-.27, .16, -.025]);
  dance.update(5, true);
  expect([pink.rotation.x, orange.rotation.x]).toEqual([-.26, -.41]);
  expect(upright.children).toEqual([turn]);
  dance.dispose();
});

it('puts the bounded Dragon Lily atmosphere in the upright frame and disposes it', () => {
  const upright = new Group(), turn = new Group();
  upright.add(turn);
  turn.add(new Group());
  const dragon = createLilyCinematics('blushing-ember', turn, upright);
  const atmosphere = upright.children[1] as Points;
  dragon.update(.75, false);
  expect(atmosphere).toBeInstanceOf(Points);
  expect(atmosphere.geometry.attributes.position.count).toBe(8);
  expect(atmosphere.visible).toBe(true);
  dragon.update(.75, true);
  expect(atmosphere.visible).toBe(false);
  dragon.dispose();
  expect(upright.children).toEqual([turn]);
});

it.each([['sunlit-flame', -1], ['blushing-ember', 1]] as const)(
  'adds the %s directional accent only in its final preview', (variant, side) => {
    const upright = new Group(), turn = new Group(), piece = new Group();
    const material = new MeshStandardMaterial(), geometry = new BoxGeometry();
    upright.add(turn);
    turn.add(piece);
    const baseline = createLilyCinematics(variant, turn, upright);
    const name = 'Soft directional lily light';
    expect(upright.getObjectByName(name)).toBeUndefined();
    const baselineAngle = baseline.turnAt(4.25, false);
    baseline.dispose();

    piece.add(new Mesh(geometry, material));
    const final = createLilyCinematics(variant, turn, upright, undefined, true);
    const shaft = upright.getObjectByName(name) as Mesh;
    const shader = shaft.material as ShaderMaterial;
    const geometryDisposal = vi.spyOn(shaft.geometry, 'dispose');
    expect(final.turnAt(4.25, false)).toBe(baselineAngle);
    expect(shaft.geometry.index?.count).toBe(6);
    expect(shader.depthTest).toBe(true);
    expect(shader.depthWrite).toBe(false);
    final.update(2, false);
    expect(shaft.visible).toBe(true);
    expect(Math.sign(shader.uniforms.lilyBeamSource.value.x - shader.uniforms.lilyBeamTip.value.x)).toBe(side);
    expect(material.customProgramCacheKey()).toContain('directional-shaft');
    final.update(2, true);
    expect(shaft.visible).toBe(false);
    expect(shader.uniforms.lilyBeamAmount.value).toBe(0);
    final.update(6.5, false);
    expect(shaft.visible).toBe(false);
    final.dispose();
    expect(upright.getObjectByName(name)).toBeUndefined();
    expect(geometryDisposal).toHaveBeenCalledOnce();
    material.dispose();
    geometry.dispose();
  },
);
