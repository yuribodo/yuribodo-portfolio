"""Convert CDmir / TinyWorlds CC0 Blender deer, preserving skinning and textures.
blender -b SOURCE.blend --disable-autoexec --python scripts/export-textured-wildlife.py -- OUTPUT.glb
"""
import bpy,sys
import numpy as np
output=sys.argv[sys.argv.index('--')+1]
arm=next(o for o in bpy.data.objects if o.type=='ARMATURE')
arm.animation_data.action=None
keep={'Eat.001':'Eating','Idle.000':'Idle','LookAround.000':'Idle_2'}
for action in list(bpy.data.actions):
 if action.name not in keep:bpy.data.actions.remove(action)
 else:
  action.name=keep[action.name]
  for curve in list(action.fcurves):
   if 'pose.bones["' in curve.data_path:
    bone=curve.data_path.split('pose.bones["',1)[1].split('"',1)[0]
    if bone not in arm.pose.bones:action.fcurves.remove(curve)
for mat in bpy.data.materials:
 mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear();out=nodes.new('ShaderNodeOutputMaterial');bsdf=nodes.new('ShaderNodeBsdfPrincipled');mat.node_tree.links.new(bsdf.outputs['BSDF'],out.inputs['Surface']);bsdf.inputs['Roughness'].default_value=.87
 label=mat.name.lower();image=None;normal=None
 if label in ['body','head']:
  image=bpy.data.images.get('doe-'+label) or bpy.data.images.get(label)
  normal=bpy.data.images.get('deer-'+label+'-normal.png')
 elif label=='antlers':image=bpy.data.images.get('deer-antlers.png');normal=bpy.data.images.get('deer-antlers-normal.png')
 elif label=='eye':bsdf.inputs['Base Color'].default_value=(.012,.008,.005,1);bsdf.inputs['Roughness'].default_value=.2
 if image:
  tex=nodes.new('ShaderNodeTexImage');tex.image=image;mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
 if normal:
  normal.colorspace_settings.name='Non-Color';tex=nodes.new('ShaderNodeTexImage');tex.image=normal;n=nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.65;mat.node_tree.links.new(tex.outputs['Color'],n.inputs['Color']);mat.node_tree.links.new(n.outputs['Normal'],bsdf.inputs['Normal'])
for o in list(bpy.data.objects):
 if o.type not in ['MESH','ARMATURE'] or o.name.startswith('Plane'):bpy.data.objects.remove(o,do_unlink=True);continue
 o.hide_set(False);o.hide_render=False;o.select_set(True)
 if o.type=='MESH':
  o.data.validate(clean_customdata=False)
  for p in o.data.polygons:p.use_smooth=True
  # One Catmull-Clark level softens the silhouette while retaining the author's UVs.
  bpy.context.view_layer.objects.active=o
  arm_mod=next((m for m in o.modifiers if m.type=='ARMATURE'),None)
  if arm_mod:arm_mod.show_viewport=False
  sub=o.modifiers.new('Smooth silhouette','SUBSURF');sub.levels=1;sub.uv_smooth='NONE'
  bpy.ops.object.modifier_move_up(modifier=sub.name)
  bpy.ops.object.modifier_apply(modifier=sub.name)
  if arm_mod:arm_mod.show_viewport=True
# The source stag atlas has blue diagnostic padding outside the fur islands.
# Keep UV samples inside the painted area (including a mip-filter guard band).
# This adjusts the mesh UV boundary; the author's texture pixels remain unchanged.
for o in bpy.data.objects:
 if o.type!='MESH' or not o.data.uv_layers.active:continue
 uv=o.data.uv_layers.active.data
 for slot,material in enumerate(o.data.materials):
  bsdf=next((n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if not bsdf or not bsdf.inputs['Base Color'].is_linked:continue
  texture=bsdf.inputs['Base Color'].links[0].from_node
  if texture.type!='TEX_IMAGE':continue
  image=texture.image;w,h=image.size
  pixels=np.empty(w*h*4,dtype=np.float32);image.pixels.foreach_get(pixels);pixels=pixels.reshape(h,w,4)
  blue=(pixels[:,:,2]>pixels[:,:,0]*1.8)&(pixels[:,:,2]>pixels[:,:,1]*1.8)&(pixels[:,:,2]>.2)
  if np.count_nonzero(blue)<100:continue
  valid=(~blue)&(pixels[:,:,:3].sum(axis=2)>.02)
  for _ in range(10):valid=valid&np.roll(valid,1,0)&np.roll(valid,-1,0)&np.roll(valid,1,1)&np.roll(valid,-1,1)
  adjusted=0
  for face in o.data.polygons:
   if face.material_index!=slot:continue
   for index in face.loop_indices:
    u,v=uv[index].uv;x=int(u*w)%w;y=int(v*h)%h
    if valid[y,x]:continue
    x0=max(0,x-40);x1=min(w,x+41);y0=max(0,y-40);y1=min(h,y+41)
    ys,xs=np.nonzero(valid[y0:y1,x0:x1])
    if not len(xs):continue
    best=np.argmin((xs+x0-x)**2+(ys+y0-y)**2)
    uv[index].uv=((xs[best]+x0+.5)/w,(ys[best]+y0+.5)/h);adjusted+=1
  print('UV padding guard:',o.name,material.name,adjusted)
bpy.context.view_layer.objects.active=arm
bpy.context.scene.render.fps=24
bpy.ops.export_scene.gltf(filepath=output,export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_anim_slide_to_zero=True,export_skins=True,export_morph=False)
