import { getAllPlaygroundUser } from '@/modules/dashboard/actions'
import AddNewButton from '@/modules/dashboard/components/addnew'
import AddRepo from '@/modules/dashboard/components/addrepo'
import EmptyState from '@/modules/dashboard/components/empty-state'
import ProjectTable from '@/modules/dashboard/components/project-table'
import React from 'react'

async function Page() {
  const  playground = await getAllPlaygroundUser() 
  return (
    <div className='flex flex-col justify-start items-center min-h mx-auto max-w-7xl px-4 py-10'>
      <div className='grid grid-cols-1  md:grid-cols-2 gap-6 w-full'>
    <AddNewButton/>
    <AddRepo/>
</div>
        <div className='mt-10 flex flex-col justify-center items-center w-full'>
          {
            playground && playground. length === 0 ?
            (<EmptyState/>
            ):
             (<ProjectTable
              projects= {playground || []}
              onDeleteProject = {()=>{}}
                  onUpdateProject= {()=>{}}
                  onDuplicateProject= {()=>{}}
            />)
          }
          </div>  
    </div>
  )
}

export default Page