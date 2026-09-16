"""Assemble a geological sky island and carved chess monuments from CC0 inputs.
Source: Poly Haven Coastal Cliff 02 (Rob Tuytel) and Chess Set (Riley Queen).
Run Blender --background --python this_file -- --source-dir /path/to/skybound-assets
"""
import argparse,math,sys
from pathlib import Path
import bpy
from mathutils import Matrix,Vector
args=argparse.ArgumentParser();args.add_argument('--source-dir',required=True);args=args.parse_args(sys.argv[sys.argv.index('--')+1:])
source=Path(args.source_dir);root=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def apply(o):
 bpy.context.view_layer.update();o.data=o.data.copy();o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4)
def center(o):
 vs=[v.co for v in o.data.vertices];lo=Vector([min(v[i] for v in vs) for i in range(3)]);hi=Vector([max(v[i] for v in vs) for i in range(3)])
 o.data.transform(Matrix.Translation(Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z))));return hi-lo

def plain(name,color,rough=.8,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal;return m

def cube(name,p,scale,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:
  m=o.modifiers.new('Dressed stone edges','BEVEL');m.width=bevel;m.segments=2;bpy.ops.object.modifier_apply(modifier=m.name)
 return o

def export(name):
 bpy.context.view_layer.update();bpy.ops.export_scene.gltf(filepath=str(root/'assets/lobby-world/production'/name),export_format='GLB',export_materials='EXPORT',export_cameras=False,export_lights=False)

# Keep only the actual chess sculptures, retaining their carved faces and UVs.
bpy.ops.import_scene.gltf(filepath=str(source/'chess_set/chess_set.gltf'))
selected={'piece_knight_white_01':('Carved knight',10.8,(-3.2,0,0.42),-math.pi/2),'piece_pawn_white_01':('Turned pawn',7.0,(5.0,2.2,0.42),0)}
for o in list(bpy.data.objects):
 if o.name not in selected:bpy.data.objects.remove(o,do_unlink=True);continue
 name,height,p,yaw=selected[o.name];apply(o);dims=center(o);o.data.transform(Matrix.Scale(height/dims.z,4));o.location=p;o.rotation_euler.z=yaw;o.name=name
 for m in o.data.materials:m.name='Chess marble'
# Continuous geological shell assembled from an eroded cliff, not a low-poly cone.
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(root/'assets/lobby-world/production/coastal-cliff.glb'))
rock=next(o for o in set(bpy.data.objects)-before if o.type=='MESH');apply(rock);center(rock)
bpy.context.view_layer.objects.active=rock;d=rock.modifiers.new('Distant rock budget','DECIMATE');d.ratio=.14;bpy.ops.object.modifier_apply(modifier=d.name)
rock.name='Island eroded stone'
for m in rock.data.materials:m.name='Island rock'
rocks=[]
for i in range(9):
 a=i/9*math.tau;o=rock.copy();o.data=rock.data.copy();bpy.context.collection.objects.link(o);o.location=(math.cos(a)*6.8,math.sin(a)*6.8,-6.3-.5*math.sin(i*1.8));o.rotation_euler.z=a+math.pi/2;o.scale=(.25,.5,.64+.07*math.sin(i*2.1));rocks.append(o)
# Tilted rock masses converge underneath; the silhouettes retain real erosion.
for i in range(5):
 a=i/5*math.tau;o=rock.copy();o.data=rock.data.copy();bpy.context.collection.objects.link(o);o.location=(math.cos(a)*2.5,math.sin(a)*2.5,-11.5);o.rotation_euler=(.3*math.cos(a),.25*math.sin(a),a);o.scale=(.16,.4,.75);rocks.append(o)
bpy.data.objects.remove(rock,do_unlink=True)
# Irregular ground crown, partly occupied by a sunken chess court.
soil=plain('Island moss',(.19,.29,.13));stone=plain('Ruined pale stone',(.45,.46,.40));dark=plain('Obsidian court',(.11,.13,.16),.5);ivory=plain('Ivory court',(.48,.48,.44),.65)
vertices=[(0,0,-.02)];count=96
for i in range(count):
 a=i/count*math.tau;r=8.9+.35*math.sin(i*.47)+.45*math.cos(i*.79);vertices.append((math.cos(a)*r,math.sin(a)*r,-.05+.14*math.sin(i*.41)))
faces=[(0,i+1,(i+1)%count+1) for i in range(count)]
m=bpy.data.meshes.new('Uneven ground crown');m.from_pydata(vertices,[],faces);m.materials.append(soil);o=bpy.data.objects.new('Island crown',m);bpy.context.collection.objects.link(o)
for x in range(-4,5):
 for y in range(-3,4):
  if abs(x)==4 and abs(y)==3:continue
  cube('Weathered chess court',(x*1.38,y*1.38,.07),(1.36,1.36,.14),dark if (x+y)%2 else ivory,.025)
# Proper stepped plinths give the sculptures weight at their feet.
for x,y,r in [(-3.2,0,2.5),(5,2.2,1.8)]:
 for step in range(3):
  bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r-step*.14,depth=.14,location=(x,y,.16+step*.14));o=bpy.context.object;o.name='Monument foundation';o.data.materials.append(stone)
# A broken ring of columns and remnants of an arcade provide a human scale.
for i in range(14):
 a=i/14*math.tau;x,y=math.cos(a)*7.5,math.sin(a)*7.5
 if y < -4:continue
 h=1.2+(i%4)*.45
 cube('Column footing',(x,y,.12),(.7,.7,.24),stone,.035)
 bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.19,depth=h,location=(x,y,h/2+.24));o=bpy.context.object;o.name='Ruined column';o.data.materials.append(stone)
 cube('Column capital',(x,y,h+.3),(.55,.55,.12),stone,.025)
# Merge the rock shell so its source textures cost a single draw.
bpy.ops.object.select_all(action='DESELECT')
for o in rocks:o.select_set(True)
bpy.context.view_layer.objects.active=rocks[0];bpy.ops.object.join();bpy.context.object.name='Eroded island shell'
# Authored tree silhouettes give the rock crown scale and vegetation.
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(root/'assets/lobby-world/production/nature-kit.glb'))
imported=set(bpy.data.objects)-before
templates=[o for o in imported if o.type=='MESH' and o.name.startswith('F1_Tree1_')]
for o in templates:apply(o);o.parent=None
for i,(x,y,scale) in enumerate([(-7,2,.35),(-4,6,.42),(1,6,.35),(6,-4,.3)]):
 for template in templates:
  o=template.copy();o.data=template.data.copy();o.parent=None;bpy.context.collection.objects.link(o);o.name='Island tree '+str(i)+' '+template.name;o.location=(x,y,0);o.scale=(scale,scale,scale);o.rotation_euler.z=i*1.9
for o in imported:bpy.data.objects.remove(o,do_unlink=True)
export('chess-monuments.glb')
# A reusable rock island, without monuments or court, replaces the old faceted satellites.
for o in list(bpy.data.objects):
 if o.type!='MESH' or (o.name not in ['Eroded island shell','Island crown'] and not o.name.startswith('Island tree')):bpy.data.objects.remove(o,do_unlink=True)
export('geological-island.glb')
print('EXPORTED chess-monuments and geological-island',flush=True)
