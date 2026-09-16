"""Bake eight far-canopy views from Poly Haven's authored Blender LODs.
The nearby tree remains full 3D. These are individual distant-tree LODs, not scenery.
blender -b source.blend --disable-autoexec --python scripts/bake-tree-canopies.py -- ASSET OUTPUT_DIR
"""
import bpy,sys,math,json,pathlib
from mathutils import Vector
name,out=sys.argv[sys.argv.index('--')+1:];out=pathlib.Path(out);out.mkdir(parents=True,exist_ok=True)
selected='pine_tree_01_b_LOD2'if name=='pine_tree_01'else'tree_small_02_LOD1'
tree=bpy.data.objects[selected]
# Unlink the unneeded multi-million-polygon specimens before rendering.
for o in list(bpy.data.objects):
 if o!=tree:bpy.data.objects.remove(o,do_unlink=True)
for data in list(bpy.data.meshes):
 if data.users==0:bpy.data.meshes.remove(data)
for c in bpy.context.scene.collection.children:
 c.hide_render=False;c.hide_viewport=False
for layer in bpy.context.view_layer.layer_collection.children:layer.exclude=False;layer.hide_viewport=False
for c in tree.users_collection:c.hide_render=False;c.hide_viewport=False
bpy.context.scene.collection.objects.link(tree)if tree.name not in bpy.context.scene.collection.objects else None
tree.hide_render=False;tree.hide_viewport=False;tree.hide_set(False)
coords=[tree.matrix_world@Vector(c)for c in tree.bound_box]
low=Vector([min(c[i]for c in coords)for i in range(3)]);high=Vector([max(c[i]for c in coords)for i in range(3)])
tree.location-=Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z));bpy.context.view_layer.update()
height=high.z-low.z;width=max(high.x-low.x,high.y-low.y);size=max(height,width)*1.10
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True
# CUDA is optional; the CPU path keeps asset builds reproducible.
prefs=bpy.context.preferences.addons['cycles'].preferences
try:
 prefs.compute_device_type='CUDA';prefs.get_devices()
 for device in prefs.devices:device.use=device.type=='CUDA'
 if any(d.type=='CUDA'for d in prefs.devices):scene.cycles.device='GPU'
except Exception:pass
scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
world=bpy.data.worlds.new('Canopy daylight');world.use_nodes=True;scene.world=world
world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.67,.82,1);world.node_tree.nodes['Background'].inputs[1].default_value=.8
sun_data=bpy.data.lights.new('Sun','SUN');sun_data.energy=3;sun_data.angle=.1;sun=bpy.data.objects.new('Sun',sun_data);scene.collection.objects.link(sun)
sun.rotation_euler=Vector((52,-38,-64)).to_track_quat('-Z','Y').to_euler()
cam_data=bpy.data.cameras.new('Canopy camera');cam_data.type='ORTHO';cam_data.ortho_scale=size;cam=bpy.data.objects.new('Canopy camera',cam_data);scene.collection.objects.link(cam);scene.camera=cam
for i in range(8):
 angle=i*math.pi/4;cam.location=(math.sin(angle)*height*3,-math.cos(angle)*height*3,height*.8)
 target=Vector((0,0,height*.5));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(out/f'{name}-{i}.png');bpy.ops.render.render(write_still=True)
(out/f'{name}.json').write_text(json.dumps({'height':height,'size':size,'frames':8}))
# Export the authored near LOD with its original material maps and leaf coverage.
bpy.ops.object.select_all(action='DESELECT');tree.select_set(True);bpy.context.view_layer.objects.active=tree;tree.name='canopy-near'
bpy.ops.export_scene.gltf(filepath=str(out/f'{name}-near.glb'),export_format='GLB',use_selection=True,export_animations=False,export_apply=True)
