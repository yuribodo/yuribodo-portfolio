"""Convert the user-supplied Sketchfab sources; run Blender with --disable-autoexec.
Usage: blender -b --disable-autoexec --python scripts/build-world-characters.py -- SOURCE_ROOT OUTPUT_DIR CHARACTER
Source ZIPs (including the two nested OBJ ZIPs) must already be extracted.
"""
import bpy, sys, math, json, bmesh
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix

args=sys.argv[sys.argv.index('--')+1:]
source_root,out,kind=Path(args[0]),Path(args[1]),args[2]
out.mkdir(parents=True,exist_ok=True)
folders={'going-merry':'one-piece-going-merry','snorlax':'snorlax-sleep','ainz':'ainz-ooal-gown','lancelot':'gd53-leonardo-hayasida-mod2','fishstick':'fishstick'}
folder=source_root/folders[kind]

def pbr(material,color=(.5,.5,.5,1),image=None,rough=.7,metal=0):
 material.use_nodes=True
 nodes=material.node_tree.nodes;nodes.clear()
 bs=nodes.new('ShaderNodeBsdfPrincipled');bs.inputs['Base Color'].default_value=color
 bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 output=nodes.new('ShaderNodeOutputMaterial');material.node_tree.links.new(bs.outputs['BSDF'],output.inputs['Surface'])
 if image:
  tex=nodes.new('ShaderNodeTexImage');tex.image=image
  material.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 return bs

def image_file(path):
 img=bpy.data.images.load(str(path),check_existing=True)
 return img

def texture(material,bs,path,socket,normal=False):
 img=image_file(path);img.colorspace_settings.name='Non-Color' if socket not in ['Base Color','Emission Color'] else 'sRGB'
 n=material.node_tree.nodes.new('ShaderNodeTexImage');n.image=img
 if normal:
  nm=material.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.55
  material.node_tree.links.new(n.outputs['Color'],nm.inputs['Color']);material.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
 else:material.node_tree.links.new(n.outputs['Color'],bs.inputs[socket])

def normalize_static(objects):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.object.convert(target='MESH')
 bpy.ops.object.join()
 obj=bpy.context.object
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 pts=[v.co for v in obj.data.vertices]
 lo=Vector(tuple(min(v[i] for v in pts) for i in range(3)));hi=Vector(tuple(max(v[i] for v in pts) for i in range(3)))
 center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 divisor=max(hi.x-lo.x,hi.y-lo.y) if kind=='going-merry' else hi.z-lo.z
 for v in obj.data.vertices:v.co=(v.co-center)/divisor
 obj.name=kind
 return obj

if kind=='fishstick':
 # Read only the motion from the other character. No NeonCat mesh/textures ship.
 bpy.ops.wm.open_mainfile(filepath=str(source_root/'orange-justice/source/NeoNCat.blend'),load_ui=False,use_scripts=False)
 dance_rig=max((o for o in bpy.data.objects if o.type=='ARMATURE'),key=lambda o:len(o.data.bones))
 rest={b.name:b.matrix_local.to_quaternion().copy() for b in dance_rig.data.bones}
 dance_height=dance_rig.data.bones['pelvis'].head_local.z
 motion=[]
 for f in range(196):
  bpy.context.scene.frame_set(f)
  motion.append({b.name:(b.rotation_quaternion.copy(),b.location.copy()) for b in dance_rig.pose.bones})
 bpy.ops.wm.open_mainfile(filepath=str(folder/'source/Fishstick.blend'),load_ui=False,use_scripts=False)
 rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
 meshes=[o for o in bpy.data.objects if o.type=='MESH']
 # Repair duplicated, unparented neck helpers in the supplied Fishstick rig.
 # The head must inherit the dancing spine rather than stay fixed in space.
 bpy.context.view_layer.objects.active=rig;rig.select_set(True)
 bpy.ops.object.mode_set(mode='EDIT')
 rig.data.edit_bones['neck_02'].parent=rig.data.edit_bones['neck_01']
 rig.data.edit_bones['neck_01.001'].parent=rig.data.edit_bones['head']
 rig.data.edit_bones['neck_01.002'].parent=rig.data.edit_bones['neck_01']
 bpy.ops.object.mode_set(mode='OBJECT')
 for m in meshes[0].data.materials:
  part='Hat' if 'hat' in m.name.lower() else 'Head' if 'head' in m.name.lower() else 'Body'
  img=image_file(folder/'textures'/('T_Male_Commando_Teriyaki_Fish_'+part+'_D.tga.png'))
  pbr(m,image=img,rough=.64)
 # Align the source rest-frame rotations to the target bone axes; preserve
 # target lengths instead of importing the other character's limb translations.
 correction={b.name:b.matrix_local.to_quaternion().inverted() @ rest[b.name] for b in rig.data.bones if b.name in rest}
 ratio=rig.data.bones['pelvis'].head_local.z/dance_height
 rig.animation_data_create();rig.animation_data.action=bpy.data.actions.new('Orange_Justice')
 bpy.context.scene.render.fps=30;bpy.context.scene.frame_start=0;bpy.context.scene.frame_end=195
 for f,pose in enumerate(motion):
  bpy.context.scene.frame_set(f)
  for b in rig.pose.bones:
   if b.name not in correction:continue
   b.rotation_mode='QUATERNION';q,loc=pose[b.name];c=correction[b.name]
   b.rotation_quaternion=c @ q @ c.inverted()
   b.location=c @ loc * ratio if b.name in ['root','pelvis'] else Vector((0,0,0))
   b.scale=(1,1,1)
   b.keyframe_insert('rotation_quaternion',frame=f)
   if b.name in ['root','pelvis']:b.keyframe_insert('location',frame=f)
 # Copy the first pose at the end for a seamless cyclic boundary.
 for b in rig.pose.bones:
  if b.name not in correction:continue
  q,loc=motion[0][b.name];c=correction[b.name]
  b.rotation_quaternion=c @ q @ c.inverted()
  b.location=c @ loc * ratio if b.name in ['root','pelvis'] else Vector((0,0,0))
  b.keyframe_insert('rotation_quaternion',frame=195)
  if b.name in ['root','pelvis']:b.keyframe_insert('location',frame=195)
 bpy.context.scene.frame_set(0)
 root=bpy.data.objects.new('Fishstick_Orientation',None);bpy.context.collection.objects.link(root)
 rig.parent=root # Source faces -Y in Blender, which exports as runtime +Z.
 for o in list(bpy.data.objects):
  if o not in [rig,root]+meshes:bpy.data.objects.remove(o,do_unlink=True)
elif kind=='snorlax':
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.fbx(filepath=str(folder/'source/SNORLAX.fbx'))
 for o in list(bpy.data.objects):
  if o.name!='Cube.013':bpy.data.objects.remove(o,do_unlink=True)
 obj=bpy.data.objects['Cube.013']
 mat=obj.data.materials[0]
 pbr(mat,image=image_file(folder/'textures/SNORLAX_Material.002_AlbedoTransparency.png'),rough=.86)
 obj=normalize_static([obj])
 mod=obj.modifiers.new('Web silhouette budget','DECIMATE');mod.ratio=.18
 bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
 for p in obj.data.polygons:p.use_smooth=True
 obj.shape_key_add(name='Basis');breath=obj.shape_key_add(name='Sleeping breath')
 for v in breath.data:
  # Tiny chest expansion, leaving the feet and bottom contact unchanged.
  w=math.exp(-((v.co.z-.5)/.23)**2)*min(1,max(0,v.co.z/.15))
  v.co.z+=.009*w
 for f,val in [(0,0),(48,1),(108,0)]:breath.value=val;breath.keyframe_insert('value',frame=f)
 obj.data.shape_keys.animation_data.action.name='Snorlax_Breath'
 bpy.context.scene.render.fps=30;bpy.context.scene.frame_start=0;bpy.context.scene.frame_end=108
 bpy.context.scene.frame_set(0)
elif kind=='ainz':
 bpy.ops.wm.open_mainfile(filepath=str(folder/'source/skull.blend'),load_ui=False,use_scripts=False)
 for o in list(bpy.data.objects):
  if o.type!='MESH' or any(m and m.name in ['Aura','Aura.001','Circle_1'] for m in getattr(o.data,'materials',[])):
   bpy.data.objects.remove(o,do_unlink=True)
 for m in bpy.data.materials:
  old=list(m.node_tree.nodes) if m.use_nodes else []
  img=next((n.image for n in old if n.type=='TEX_IMAGE' and n.image),None)
  color=next((tuple(n.inputs['Color'].default_value) for n in old if n.type=='BSDF_DIFFUSE'),(.08,.06,.10,1))
  if m.name=='gold':color=(.55,.32,.035,1)
  if m.name=='bone':color=(.83,.79,.65,1)
  bs=pbr(m,color,img,rough=.37 if m.name.startswith('ball') else .7,metal=.65 if m.name=='gold' else 0)
  if m.name=='Material.004':bs.inputs['Emission Color'].default_value=(1,.015,.005,1);bs.inputs['Emission Strength'].default_value=.7
 obj=normalize_static([o for o in bpy.data.objects if o.type=='MESH'])
else:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 objpath=next(folder.rglob('*.obj'))
 bpy.ops.wm.obj_import(filepath=str(objpath))
 if kind=='going-merry':
  mat=bpy.data.materials.new('Going Merry painted atlas')
  pbr(mat,image=image_file(folder/'textures/Untitled.001.png'),rough=.8)
  for o in bpy.data.objects:
   if o.type=='MESH':o.data.materials.clear();o.data.materials.append(mat)
 else:
  # The OBJ includes two reference-image planes in its default material slot.
  for ob in bpy.data.objects:
   if ob.type!='MESH':continue
   bm=bmesh.new();bm.from_mesh(ob.data)
   reference_slots={i for i,m in enumerate(ob.data.materials) if m.name=='initialShadingGroup'}
   bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.material_index in reference_slots],context='FACES')
   bm.to_mesh(ob.data);bm.free()
  for mat in bpy.data.materials:
   group='blinn2SG' if 'blinn2' in mat.name else 'blinn1SG'
   prefix='GD53_MOD2_A2_LeonardoHayasida-2_'+group+'_'
   bs=pbr(mat,rough=.5,metal=.3)
   for suffix,socket in [('B','Base Color'),('R','Roughness'),('M','Metallic'),('E','Emission Color'),('N','Normal')]:
    texture(mat,bs,folder/'textures'/(prefix+suffix+'.png'),socket,normal=suffix=='N')
   bs.inputs['Emission Strength'].default_value=.45
 obj=normalize_static([o for o in bpy.data.objects if o.type=='MESH'])

# Cap textures before exporting; retain aspect ratio and original UVs.
used=set()
for o in bpy.data.objects:
 if o.type=='MESH':
  for mat in o.data.materials:
   if mat and mat.use_nodes:
    for n in mat.node_tree.nodes:
     if n.type=='TEX_IMAGE' and n.image:used.add(n.image)
for img in used:
 if max(img.size)>2048:
  r=2048/max(img.size);img.scale(max(1,round(img.size[0]*r)),max(1,round(img.size[1]*r)))
# Disable source render hiding and avoid unrelated lights/cameras in the export.
for o in bpy.data.objects:
 o.hide_set(False);o.hide_viewport=False;o.hide_render=False
bpy.ops.wm.save_as_mainfile(filepath=str(out/(kind+'.blend')))
bpy.ops.export_scene.gltf(filepath=str(out/(kind+'.glb')),export_format='GLB',export_apply=True,
 export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_frame_range=True,
 export_force_sampling=True,export_anim_single_armature=True,export_morph=True,export_lights=False,export_cameras=False,
 export_nla_strips_merged_animation_name='Orange_Justice' if kind=='fishstick' else 'Snorlax_Breath')
print('EXPORTED',kind)
