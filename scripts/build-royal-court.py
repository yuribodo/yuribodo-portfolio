"""Original stone overlook and throne for the selected Ainz fan-art model."""
import bpy,math,sys
from pathlib import Path
from mathutils import Vector
out=Path(sys.argv[sys.argv.index('--')+1]);out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
def material(name,color,metal=0,rough=.8):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
 return m
stone=material('Court - weathered pale stone',(.35,.38,.33));dark=material('Throne - obsidian',(.025,.02,.045),.25,.35);gold=material('Throne - aged gold',(.55,.31,.06),.65,.35);velvet=material('Throne - purple velvet',(.12,.028,.22),0,.95)
img=bpy.data.images.load(str(Path('public/lobby/world/rock-face-color.webp').resolve()));t=stone.node_tree.nodes.new('ShaderNodeTexImage');t.image=img
stone.node_tree.links.new(t.outputs['Color'],stone.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
def bevel(o,width=.1):
 mod=o.modifiers.new('Worn bevels','BEVEL');mod.width=width;mod.segments=3
 mod=o.modifiers.new('Weighted corners','WEIGHTED_NORMAL')
def box(name,loc,scale,mat,edge=.1):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if edge:bevel(o,edge)
 return o

def column(name,x,y,z,r,depth,mat,vertices=32):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=(x,y,z));o=bpy.context.object;o.name=name;o.data.materials.append(mat);bevel(o,.06);return o

def line(name,pts,r,mat):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=r;curve.bevel_resolution=3
 sp=curve.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o

# Deep footings meet the hillside; the front stair connects the court to the slope.
box('Hillside footing',(0,1,-3.6),(31,24,9),stone,.6)
box('Terrace cornice',(0,1,.72),(32,25,.55),stone,.2)
for row in range(8):
 for col in range(10):box('Cut stone paving',(-13.5+col*3,-9.5+row*3,1.08),(2.94,2.94,.2),stone,.025)
for i in range(7):box('Approach step',(0,-12-i*.85,.65-i*.32),(13+i*.65,1.1,.4),stone,.09)
# Side balustrades leave the entire front approach open.
for side in [-1,1]:
 for y in [-9,-5,-1,3,7,11]:
  box('Parapet plinth',(side*14.7,y,1.75),(1.2,1.2,1.5),stone,.14)
  column('Baluster',side*14.7,y,3,.3,1.8,stone)
  box('Parapet cap',(side*14.7,y,4.02),(1.3,1.3,.3),stone,.08)
 box('Continuous rail',(side*14.7,1,4.15),(.65,21,.3),stone,.1)
 # Tall portal piers and fluted shafts frame the throne.
 box('Portal pedestal',(side*11,9,2.1),(3.3,3.3,2),stone,.18)
 column('Portal column',side*11,9,9.2,1.02,12.2,stone)
 for z in [3.2,3.6,14.8,15.15]:column('Carved collar',side*11,9,z,1.3,.24,gold)
 for j in range(12):
  a=j/12*math.tau;column('Shaft fluting',side*11+math.cos(a),9+math.sin(a),9.2,.12,10.5,stone,12)
 box('Capital',(side*11,9,15.65),(3.3,3.3,.65),stone,.16)
pts=[(-11+22*i/48,9,15.8+5.5*math.sin(math.pi*i/48)) for i in range(49)]
line('Crowned arch',pts,.85,stone);line('Arch gold inlay',[(x,y-.81,z) for x,y,z in pts],.11,gold)
# Raised throne with a pointed, layered back and inlaid purple upholstery.
for i in range(3):box('Throne dais',(0,5.8,1.5+i*.45),(13-i,10-i,.45),dark,.18)
box('Throne seat',(0,5.4,4.1),(9,5.5,2.3),dark,.3)
box('Velvet cushion',(0,4.9,5.35),(8.1,4.6,.45),velvet,.2)
outline=[(-4.8,4.4),(-5.5,12),(-3.6,13.5),(-2.7,17),(0,19.5),(2.7,17),(3.6,13.5),(5.5,12),(4.8,4.4)]
verts=[(x,y,z) for y in [7.3,8.2] for x,z in outline];n=len(outline)
faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
mesh=bpy.data.meshes.new('Throne back');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Pointed obsidian throne',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(dark);bevel(o,.14)
line('Throne rim',[(x,7.15,z) for x,z in outline]+[(outline[0][0],7.15,outline[0][1])],.14,gold)
box('Velvet back',(0,7.04,10),(7,.35,9),velvet,.2)
for s in [-1,1]:
 box('Throne arm',(s*5,4.8,6.2),(1.2,6,1),dark,.25)
 line('Arm gold inlay',[(s*5,2,6.8),(s*5,5,6.8),(s*4.8,7.1,12)],.14,gold)
 for z in [3.2,6.9]:column('Arm finial',s*5,2.2,z,.6,.4,gold)
# All authored surfaces are consolidated by material into a few draw calls.
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH');bpy.ops.object.convert(target='MESH');bpy.ops.object.join();bpy.context.object.name='Ainz_Royal_Overlook'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_apply=True,export_animations=False)
