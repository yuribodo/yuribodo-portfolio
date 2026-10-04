"""Smooth the licensed dragon rig's silhouette without baking away its skeleton.
blender -b --factory-startup --python scripts/refine-dragon.py -- input.glb output.glb
"""
import bpy,bmesh,sys
source,output=sys.argv[sys.argv.index('--')+1:]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
for o in bpy.data.objects:
 if o.type!='MESH':continue
 bpy.context.view_layer.objects.active=o
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(o.data);bm.free();o.data.update()
 for p in o.data.polygons:p.use_smooth=True
 mod=o.modifiers.new('Refine membrane and body silhouette','SUBSURF');mod.levels=1
 # Apply in rest space, ahead of skin deformation, keeping bone weights.
 while o.modifiers.find(mod.name)>0:bpy.ops.object.modifier_move_up(modifier=mod.name)
 bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.ops.export_scene.gltf(filepath=output,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_skins=True)
