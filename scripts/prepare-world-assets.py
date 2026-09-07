"""Blender asset intake. See assets/lobby-world/research/asset-sources.md.
Run Blender --background --python this_file -- --source-dir /path/to/downloads
Original third-party archives stay outside the repository; only adapted exports ship.
"""
import argparse, math, sys
from pathlib import Path
import bpy
from mathutils import Vector, Matrix

args=argparse.ArgumentParser()
args.add_argument('--source-dir',required=True)
args.add_argument('--output-dir',default=str(Path(__file__).resolve().parents[1]/'assets/lobby-world/production'))
args=args.parse_args(sys.argv[sys.argv.index('--')+1:])
source=Path(args.source_dir);output=Path(args.output_dir);output.mkdir(parents=True,exist_ok=True)

def reset():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def image_node(nodes,path,color=False):
 n=nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(path),check_existing=True)
 n.image.colorspace_settings.name='sRGB' if color else 'Non-Color'
 if max(n.image.size)>2048:n.image.scale(2048,2048)
 return n

def material(name,color,normal=None,rough=None,ao=None,tint=(1,1,1,1),alpha=False):
 m=bpy.data.materials.new(name);m.use_nodes=True
 nodes=m.node_tree.nodes;nodes.clear();links=m.node_tree.links
 bsdf=nodes.new('ShaderNodeBsdfPrincipled');out=nodes.new('ShaderNodeOutputMaterial');links.new(bsdf.outputs['BSDF'],out.inputs['Surface'])
 bsdf.inputs['Base Color'].default_value=tint;bsdf.inputs['Roughness'].default_value=0.88
 if color:
  tex=image_node(nodes,color,True);links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
  if alpha:
   links.new(tex.outputs['Alpha'],bsdf.inputs['Alpha']);m.surface_render_method='DITHERED';m.use_backface_culling=False
 if normal:
  tex=image_node(nodes,normal);n=nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=0.7;links.new(tex.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],bsdf.inputs['Normal'])
 if rough:links.new(image_node(nodes,rough).outputs['Color'],bsdf.inputs['Roughness'])
 if ao:
  group=bpy.data.node_groups.get('glTF Material Output')
  if not group:
   group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
  n=nodes.new('ShaderNodeGroup');n.node_tree=group;links.new(image_node(nodes,ao).outputs['Color'],n.inputs['Occlusion'])
 return m

def apply_matrix(o,extra=Matrix.Identity(4)):
 o.data.transform(extra @ o.matrix_world);o.matrix_world=Matrix.Identity(4)

def center_objects(objects):
 verts=[v.co for o in objects for v in o.data.vertices]
 lo=Vector(tuple(min(v[i] for v in verts) for i in range(3)));hi=Vector(tuple(max(v[i] for v in verts) for i in range(3)))
 offset=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 for o in objects:o.data.transform(Matrix.Translation(-offset))
 return hi-lo

def export(name):
 bpy.context.view_layer.update()
 bpy.ops.export_scene.gltf(filepath=str(output/(name+'.glb')),export_format='GLB',export_image_format='AUTO',export_materials='EXPORT',export_yup=True,export_cameras=False,export_lights=False)
 print('EXPORTED',name,flush=True)

# Authored modular ruins: retain atlas UVs, baked relief and ambient occlusion.
root=source/'ruins/Ruins1_(AssetPack4)'
bpy.ops.wm.open_mainfile(filepath=str(root/'Blender/Ruins1_AP4.blend'))
textures=root/'FBX_Textures/Textures'
atlases={}
for i in [1,2,3]:
 t=textures/f'Atlas{i}';prefix=f'AP4_Atlas_{i}_'
 atlases[i]=material(f'Ruins_Atlas_{i}',t/(prefix+'BaseColor.png'),t/(prefix+'Normal_GL.png'),t/(prefix+'Roughness.png'),t/(prefix+'Mixed_AO.png'))
selected_ruins={'A3_Door1','A3_Gothic1','A1_StoneWall5','A2_StoneWall6','A2_StoneWall4','A3_LongStone1','A2_Stone3','A2_Stone5','A2_Stone7'}
for o in list(bpy.data.objects):
 if o.name not in selected_ruins:
  bpy.data.objects.remove(o,do_unlink=True);continue
 if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True);continue
 atlas=int(o.name[1]);o.location=(0,0,0)
 bpy.context.view_layer.update();apply_matrix(o,Matrix.Rotation(-math.pi/2,4,'Z'))
 dims=center_objects([o]);o.data.materials.clear();o.data.materials.append(atlases[atlas])
 print('RUIN',o.name,list(dims),flush=True)
export('ruins-kit')

# Two trees and reusable ground plants from the same art family.
reset();root=source/'nature/StarterNaturePack_(FoliageKit1)/FBX_Textures';textures=root/'Textures'
bark=material('Tree_Bark',textures/'Bark1/bark1_baseColor.png',textures/'Bark1/bark1_normal_GL.png')
leaves=material('Tree_Leaves',textures/'F1_Leaves_Map1.png',alpha=True)
plants=material('Ground_Plants',textures/'F1_Foliage_Map1.png',alpha=True)
for asset in ['F1_Tree1','F1_Tree2','F1_BushLow','F1_BushMid','F1_LowGrass','F1_Foliage1Patch','F1_Flower2Patch']:
 before=set(bpy.data.objects)
 bpy.ops.import_scene.fbx(filepath=str(root/'FBX'/(asset+'.fbx')))
 imported=[o for o in set(bpy.data.objects)-before if o.type=='MESH']
 for o in imported:apply_matrix(o)
 dims=center_objects(imported)
 print('NATURE',asset,list(dims),flush=True)
 group=bpy.data.objects.new(asset,None);bpy.context.collection.objects.link(group)
 for o in imported:
  is_leaf=o.name.startswith('F1_L') and asset.startswith('F1_Tree')
  mat=leaves if is_leaf or asset.startswith('F1_Bush') else bark if asset.startswith('F1_Tree') else plants
  o.name=asset+('_leaves' if is_leaf else '_trunk' if asset.startswith('F1_Tree') else '_mesh');o.data.materials.clear();o.data.materials.append(mat);o.parent=group
 group.name=asset
export('nature-kit')

# A real eroded cliff face; simplified for the midground, keeping UVs/normals.
reset();bpy.ops.import_scene.gltf(filepath=str(source/'coastal_cliff_02/coastal_cliff_02.gltf'))
for o in bpy.data.objects:
 if o.type!='MESH':continue
 bpy.context.view_layer.objects.active=o
 dec=o.modifiers.new('Web silhouette budget','DECIMATE');dec.ratio=0.045
 bpy.ops.object.modifier_apply(modifier=dec.name)
 apply_matrix(o);dims=center_objects([o]);o.name='CoastalCliff'
 print('CLIFF',list(dims),'faces',len(o.data.polygons),flush=True)
export('coastal-cliff')
