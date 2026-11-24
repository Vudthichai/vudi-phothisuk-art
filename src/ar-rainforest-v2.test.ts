// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Sprite } from 'three';
import { createCinematicMist, MIST_LAYER_COUNT, MIST_TEXTURE_SIZE } from './ar/experimental/mist';
import { installAnchoredPinch } from './ar/experimental/pinch';
import { CINEMATIC_PLACEMENT, placeRainforest, setupRainforestLab } from './ar/experimental/rainforest';
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });
function touch(target: HTMLElement, type: string, points: { identifier: number; clientX: number; clientY: number; target?: HTMLElement }[]) {
 const event = new Event(type, { bubbles: true, cancelable: true });
 Object.defineProperty(event, 'touches', { value: points.map(p => ({ ...p, target: p.target ?? target })) }); target.dispatchEvent(event); return event;
}
it('uses only four soft depth-tested mist sprites and one 64KiB texture, with no per-frame texture upload', () => {
 const mist = createCinematicMist();expect(mist.root.children).toHaveLength(MIST_LAYER_COUNT);
 expect(mist.texture.image.data.byteLength).toBe(128 * 128 * 4);expect(MIST_TEXTURE_SIZE).toBe(128);
 const textureVersion = mist.texture.version, initial = mist.root.children.map(s => s.position.toArray());
 for (const child of mist.root.children) { expect(child).toBeInstanceOf(Sprite); const s = child as Sprite; expect(s.material.map).toBe(mist.texture);expect(s.material.depthTest).toBe(true);expect(s.material.depthWrite).toBe(false);expect(s.material.opacity).toBeLessThanOrEqual(.12); }
 mist.update(12, false);expect(mist.root.children.map(s => s.position.toArray())).not.toEqual(initial);expect(mist.texture.version).toBe(textureVersion);
 mist.update(0, true);const still = mist.root.children.map(s => s.position.toArray());mist.update(100, true);expect(mist.root.children.map(s => s.position.toArray())).toEqual(still);
 mist.setEnabled(false);mist.update(200, false);expect(mist.root.visible).toBe(false);
 const release = vi.spyOn(mist.texture, 'dispose');mist.dispose();mist.dispose();expect(release).toHaveBeenCalledOnce();
});
it('ignores single-finger movement, translation and twisting; clamps two-finger scale and restores surface behavior', () => {
 const surface = document.createElement('div');document.body.append(surface);surface.style.touchAction = 'pan-y';const change = vi.fn();let enabled = true;
 const pinch = installAnchoredPinch(surface, change, () => enabled);
 touch(surface, 'touchstart', [{ identifier: 1, clientX: 0, clientY: 0 }]);touch(surface, 'touchmove', [{ identifier: 1, clientX: 100, clientY: 100 }]);expect(change).not.toHaveBeenCalled();
 expect(touch(surface, 'touchstart', [{ identifier: 1, clientX: 0, clientY: 0 }, { identifier: 2, clientX: 100, clientY: 0 }]).defaultPrevented).toBe(true);
 touch(surface, 'touchmove', [{ identifier: 1, clientX: 200, clientY: 200 }, { identifier: 2, clientX: 200, clientY: 300 }]);expect(change).not.toHaveBeenCalled();
 touch(surface, 'touchmove', [{ identifier: 1, clientX: 0, clientY: 0 }, { identifier: 2, clientX: 300, clientY: 0 }]);expect(change).toHaveBeenLastCalledWith(1.5);
 touch(surface, 'touchmove', [{ identifier: 1, clientX: 0, clientY: 0 }, { identifier: 2, clientX: 1, clientY: 0 }]);expect(change).toHaveBeenLastCalledWith(.75);
 enabled = false;change.mockClear();touch(surface, 'touchmove', [{ identifier: 1, clientX: 0, clientY: 0 }, { identifier: 2, clientX: 200, clientY: 0 }]);expect(change).not.toHaveBeenCalled();
 enabled = true;pinch.reset();const gesture = new Event('gesturestart', { cancelable: true });surface.dispatchEvent(gesture);expect(gesture.defaultPrevented).toBe(true);
 pinch.dispose();expect(surface.style.touchAction).toBe('pan-y');const after = new Event('gesturestart', { cancelable: true });surface.dispatchEvent(after);expect(after.defaultPrevented).toBe(false);
});
it('does not capture touches that begin on recording controls outside the camera surface', () => {
 const surface = document.createElement('div'),record = document.createElement('button');document.body.append(surface,record);const change=vi.fn();const pinch=installAnchoredPinch(surface,change,()=>true);
 const event=touch(surface,'touchstart',[{identifier:1,clientX:0,clientY:0},{identifier:2,clientX:100,clientY:0,target:record}]);expect(event.defaultPrevented).toBe(false);expect(change).not.toHaveBeenCalled();pinch.dispose();
});
it('keeps the root point and upright orientation fixed across the allowed collector scale range', () => {
 const model=new Group();model.add(new Mesh(new BoxGeometry(2,4,1),new MeshStandardMaterial()));const scene=placeRainforest(model,CINEMATIC_PLACEMENT);
 for(const factor of [.75,1,1.5]) { scene.setPlacement({...CINEMATIC_PLACEMENT,height:CINEMATIC_PLACEMENT.height*factor});scene.root.updateMatrixWorld(true);const bounds=new Box3().setFromObject(scene.root);expect(bounds.min.z).toBeCloseTo(0);expect(bounds.max.z).toBeCloseTo(2.6*factor);expect(scene.root.position.toArray()).toEqual([0,-.55,0]);expect(scene.root.rotation.x).toBeCloseTo(Math.PI/2); }
});
it('hides the lab entirely in normal V2, keeps diagnostics opt-in, and adds only a discreet Reset', () => {
 const host=document.createElement('main');host.innerHTML='<div class="ar-surface"></div><div class="ar-controls"></div><div class="ar-actions"></div><div class="ar-guidance"></div>';document.body.append(host);
 const view=setupRainforestLab(host,{cinematic:true});expect(host.querySelector('.rainforest-lab')).toBeNull();expect(host.querySelector('input')).toBeNull();expect(view.onMetrics).toBeUndefined();expect(host.querySelector('[aria-label="Reset view"]')).toBeTruthy();view.dispose();expect(host.querySelector('[aria-label="Reset view"]')).toBeNull();
 const debug=setupRainforestLab(host,{cinematic:true,diagnostics:true,mistEnabled:false});expect(host.querySelector('.rainforest-lab')).toBeTruthy();expect(host.querySelector<HTMLInputElement>('[data-mist]')!.checked).toBe(false);expect(debug.onMetrics).toBeTypeOf('function');debug.dispose();
});
