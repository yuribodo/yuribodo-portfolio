"""Bake flight for Toothless (Rigged) by Stuck On Saturn, CC BY 4.0.

blender -b --factory-startup --python scripts/build-toothless.py -- source-dir output.glb
Source directory contains the user's original source/Toothless.fbx and textures/.
Retains the artist's mesh, skin weights, facial rig and texture UVs.
"""
import bpy
import math
import pathlib
import sys
from mathutils import Quaternion, Vector

source, output = map(pathlib.Path, sys.argv[sys.argv.index('--') + 1:])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(source / 'source/Toothless.fbx'), use_anim=False)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
# Repair the creator's absolute Windows image paths using the supplied archive.
for image in bpy.data.images:
    image.filepath = str(source / 'textures' / pathlib.PureWindowsPath(image.filepath).name)
    image.reload()
for material in list(bpy.data.materials):
    material.use_nodes = True
    shader = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Metallic'].default_value = 0
    shader.inputs['Roughness'].default_value = .48 if material.name == 'Body' else .28
    if material.name == 'Material.002':
        material.name = 'Toothless eyes'
        shader.inputs['Roughness'].default_value = .2
    # FBX imports some values as emission; retain genuinely dark, shaded skin.
    shader.inputs['Emission Strength'].default_value = 0
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
# FBX has separate body and wing roots. One unweighted parent lets the chest
# rise with the power stroke without detaching the wing membranes from the body.
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
roots = [b for b in arm.data.edit_bones if b.parent is None]
root = arm.data.edit_bones.new('FlightRoot')
root.head = (0, 0, 0)
root.tail = (0, 1, 0)
for bone in roots:
    bone.parent = root
bpy.ops.object.mode_set(mode='OBJECT')
scene = bpy.context.scene
scene.render.fps = 30
scene.frame_start = 0
axes = {}
for bone in arm.pose.bones:
    bone.rotation_mode = 'QUATERNION'
    axes[bone.name] = bone.bone.matrix_local.to_3x3().inverted()

def rotate(name, rotations, frame):
    bone = arm.pose.bones[name]
    q = Quaternion()
    for axis, angle in rotations:
        q = q @ Quaternion(axes[name] @ Vector(axis), angle)
    bone.rotation_quaternion = q
    bone.keyframe_insert('rotation_quaternion', frame=frame, group=name)

def smoothstep(a, b, t):
    u = max(0, min(1, (t - a) / (b - a)))
    return u * u * (3 - 2 * u)

# Hand-shaped beat poses: lift, elbow flex, wrist flex, recovery sweep, twist.
# Unlike a single sine applied to the whole span, the wrist remains loaded
# through the bottom of the stroke and folds only as the shoulder recovers.
KEYS = [
    (0.00, (.68, .07, .01, .02, -.04)),
    (0.18, (.03, .12, .13, .00, .13)),
    (0.40, (-.52, .04, .17, .04, .06)),
    (0.60, (-.10, -.22, -.08, .44, -.27)),
    (0.81, (.50, -.14, -.07, .24, -.18)),
    (1.00, (.68, .07, .01, .02, -.04)),
]

def wing_pose(phase):
    p = phase % 1
    for i in range(len(KEYS) - 1):
        a, values = KEYS[i]
        b, following = KEYS[i + 1]
        if a <= p <= b:
            # Periodic cubic Hermite interpolation, including tangent matches
            # at the cycle seam. Do not stop at every intermediate key pose.
            prev_t, prev = KEYS[i - 1] if i else (KEYS[-2][0] - 1, KEYS[-2][1])
            next_t, next_values = KEYS[i + 2] if i + 2 < len(KEYS) else (1 + KEYS[1][0], KEYS[1][1])
            u = (p - a) / (b - a)
            h00, h10 = 2*u**3 - 3*u**2 + 1, u**3 - 2*u**2 + u
            h01, h11 = -2*u**3 + 3*u**2, u**3 - u**2
            return tuple(h00*x + h10*(y-z)/(b-prev_t)*(b-a) + h01*y + h11*(w-x)/(next_t-a)*(b-a)
                         for x,y,z,w in zip(values, following, prev, next_values))

DURATION = 10.8
scene.frame_end = round(DURATION * scene.render.fps)
for frame in range(scene.frame_end + 1):
    t = frame / scene.render.fps
    macro = math.tau * t / DURATION
    # Two powered sections separated by a real glide. The blend also softens
    # entry/exit, so the dragon never snaps into a held pose or restarts a clip.
    effort = 1 - smoothstep(3.8, 4.8, t) * (1 - smoothstep(6.8, 7.8, t))
    phase = t / 1.8 + .18 + .075 * math.sin(macro)
    wave = math.tau * phase
    body_pitch = effort * .055 * math.sin(wave - .85) + .012 * math.sin(macro)
    body_roll = .018 * math.sin(macro - .3)
    rotate('FlightRoot', [((1, 0, 0), body_pitch), ((0, 1, 0), body_roll)], frame)
    arm.pose.bones['FlightRoot'].location = (0, 0, effort * .42 * math.sin(wave - 1.1) + .08 * math.sin(macro))
    arm.pose.bones['FlightRoot'].keyframe_insert('location', frame=frame)
    # The chest moves under the head, maintaining a stable forward gaze.
    rotate('Neck', [((1, 0, 0), -body_pitch * .65)], frame)
    rotate('Head', [((1, 0, 0), -body_pitch * .35), ((0, 0, 1), .016 * math.sin(macro - .4))], frame)
    for side, sign in [('R', 1), ('L', -1)]:
        local_phase = phase + sign * .009 * math.sin(macro)
        shoulder, _, _, _, _ = wing_pose(local_phase)
        rotate('MainWingStructure.' + side, [((0, 1, 0), -sign * (.015 + effort * shoulder * .07))], frame)
        for i in range(1, 11):
            # Increasing delay bends the span through reversal instead of
            # rotating two rigid paddles in perfect synchronization.
            lift, elbow, wrist, sweep, twist = wing_pose(local_phase - (i - 1) * .026)
            if i == 1:
                flex = .06 + effort * lift
            elif i in [3, 4, 5]:
                flex = .015 + effort * elbow / 3
            elif i in [7, 8, 9]:
                flex = .012 + effort * wrist / 3
            else:
                flex = effort * .018 * math.sin(wave - i * .2)
            fold = effort * sweep / 3 if i in [3, 4, 5] else -effort * sweep * .52 / 3 if i in [7, 8, 9] else 0
            feather = effort * twist / 3 if i in [4, 5, 6] else 0
            rotate(f'MainWing{i}.{side}', [((0, 1, 0), -sign * flex),
                   ((0, 0, 1), -sign * fold), ((1, 0, 0), feather)], frame)
        for i in [1, 2, 3, 4, 6, 7, 8]:
            # Membrane fingers lag the leading edge and gently cup under load.
            pressure = effort * (.06 * math.sin(wave - .8 - i * .1))
            rotate(f'MainWingControl{i}.{side}', [((1, 0, 0), pressure)], frame)
        rotate('BackWing.' + side, [((0, 1, 0), sign * (.07 * effort * math.sin(wave - 1.5) + .035 * math.sin(macro - .5)))], frame)
        for limb in ['Front', 'Back']:
            lag = .9 if limb == 'Front' else 1.25
            rotate(f'Upper{limb}Leg.{side}', [((1, 0, 0), -.78 + effort * .07 * math.sin(wave - lag))], frame)
            rotate(f'Lower{limb}Leg.{side}', [((1, 0, 0), 1.05 + effort * .09 * math.sin(wave - lag - .25))], frame)
            rotate(f'Foot{limb}Leg.{side}', [((1, 0, 0), -.35 - effort * .035 * math.sin(wave - lag - .45))], frame)
        rotate('LowerBigEar.' + side, [((1, 0, 0), -.045 + effort * .035 * math.sin(wave - 1.1))], frame)
    for i in range(1, 8):
        rotate(f'Tail{i}', [((1, 0, 0), .038 * effort * math.sin(wave - i * .46) + .01 * math.sin(macro - i * .2)),
                           ((0, 0, 1), .038 * math.sin(macro - i * .34))], frame)
arm.animation_data.action.name = 'Toothless_Flight'
# The FBX faces Blender +Y; glTF uses Y-up. Rotate once so runtime forward is +Z.
orientation = bpy.data.objects.new('ToothlessForward', None)
scene.collection.objects.link(orientation)
for obj in list(scene.objects):
    if obj != orientation and obj.parent is None:
        obj.parent = orientation
orientation.rotation_euler.z = math.pi
scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(output.with_suffix('.blend')))
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', export_animations=True,
    export_animation_mode='ACTIONS', export_force_sampling=True, export_skins=True,
    export_morph=False, export_yup=True, export_extras=True)
print('TOOTHLESS_EXPORT', output)
